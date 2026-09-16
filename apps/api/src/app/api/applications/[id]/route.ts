import { NextRequest, NextResponse } from "next/server";
import { prisma, type ApplicationStatus } from "@scene/db";
import { getCurrentUserId } from "@/lib/current-user";

const DECISIONS: ApplicationStatus[] = ["ACCEPTED", "PASSED", "REVIEW_LATER"];

/**
 * The host's decision on one application. This is the only way anyone joins a
 * plan — accepting creates the PlanAttendee row, which is what unlocks the
 * party room and the exact address for that guest.
 */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/applications/[id]">) {
  const { id } = await ctx.params;
  const userId = getCurrentUserId(request);
  const body = await request.json();
  const status: ApplicationStatus = body.status;

  if (!DECISIONS.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of ${DECISIONS.join(", ")}` },
      { status: 400 }
    );
  }

  const application = await prisma.application.findUnique({
    where: { id },
    include: { plan: { select: { id: true, hostId: true, capacity: true } } },
  });

  if (!application) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (application.plan.hostId !== userId) {
    return NextResponse.json({ error: "not your plan" }, { status: 403 });
  }

  if (status !== "ACCEPTED") {
    const updated = await prisma.application.update({
      where: { id },
      data: { status, decidedAt: status === "REVIEW_LATER" ? null : new Date() },
    });
    return NextResponse.json(updated);
  }

  const confirmed = await prisma.planAttendee.count({
    where: { planId: application.planId, status: "CONFIRMED" },
  });
  if (confirmed >= application.plan.capacity) {
    return NextResponse.json({ error: "this plan is full" }, { status: 409 });
  }

  // Has this person been to a plan by this host before? Drives the
  // first-timer/returning split in group health.
  const previousWithHost = await prisma.planAttendee.count({
    where: {
      userId: application.applicantId,
      status: "CONFIRMED",
      plan: { hostId: userId },
    },
  });

  // Both writes or neither — a stray accepted application with no attendee row
  // would leave someone believing they're in when they aren't.
  const [updated] = await prisma.$transaction([
    prisma.application.update({
      where: { id },
      data: { status: "ACCEPTED", decidedAt: new Date() },
    }),
    prisma.planAttendee.upsert({
      where: {
        planId_userId: { planId: application.planId, userId: application.applicantId },
      },
      update: { status: "CONFIRMED" },
      create: {
        planId: application.planId,
        userId: application.applicantId,
        role: "GUEST",
        firstTime: previousWithHost === 0,
      },
    }),
  ]);

  return NextResponse.json(updated);
}
