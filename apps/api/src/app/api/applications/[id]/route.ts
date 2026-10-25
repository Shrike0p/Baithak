import { NextRequest, NextResponse } from "next/server";
import { prisma, type ApplicationStatus } from "@baithak/db";
import { getCurrentUserId } from "@/lib/current-user";
import { notify } from "@/lib/notify";

const DECISIONS: ApplicationStatus[] = ["ACCEPTED", "PASSED", "REVIEW_LATER"];

/**
 * The host's decision on one application. This is the only way anyone joins a
 * plan — accepting creates the PlanAttendee row, which is what unlocks the
 * party room and the exact address for that guest.
 */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/applications/[id]">) {
  const { id } = await ctx.params;
  const userId = await getCurrentUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const body = await request.json();
  const status: ApplicationStatus = body.status;

  // Confirming the chip-in arrived is its own action, not a decision.
  if (typeof body.paid === "boolean") return confirmPayment(id, userId, body.paid);

  if (!DECISIONS.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of ${DECISIONS.join(", ")}` },
      { status: 400 }
    );
  }

  const application = await prisma.application.findUnique({
    where: { id },
    include: { plan: { select: { id: true, hostId: true, capacity: true, title: true } } },
  });

  if (!application) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (application.plan.hostId !== userId) {
    return NextResponse.json({ error: "not your plan" }, { status: 403 });
  }

  // Taking back a yes. This used to flip the application and leave the
  // attendee row behind — the guest stayed in the party room with the
  // address. Now the seat goes with it, the same way leaving works.
  if (application.status === "ACCEPTED" && status !== "ACCEPTED") {
    if (status !== "PASSED") {
      return NextResponse.json({ error: "they're already in — remove them or leave it" }, { status: 409 });
    }
    const [updated] = await prisma.$transaction([
      prisma.application.update({ where: { id }, data: { status: "PASSED", decidedAt: new Date() } }),
      prisma.planAttendee.deleteMany({
        where: { planId: application.planId, userId: application.applicantId, role: "GUEST" },
      }),
    ]);
    notify({
      userId: application.applicantId,
      kind: "GUEST_REMOVED",
      title: `You're off the list — ${application.plan.title}`,
      body: "The host took you off this plan, so the party room and address are closed to you now.",
      href: "/discover",
      planId: application.planId,
      actorId: userId,
    });
    return NextResponse.json(updated);
  }

  if (status !== "ACCEPTED") {
    const updated = await prisma.application.update({
      where: { id },
      data: { status, decidedAt: status === "REVIEW_LATER" ? null : new Date() },
    });

    // "Review later" isn't a decision, so it isn't news.
    if (status === "PASSED") {
      notify({
        userId: application.applicantId,
        kind: "APPLICATION_DECLINED",
        title: `Not this time — ${application.plan.title}`,
        body: "The host went with a different mix. It's rarely about you.",
        href: "/discover",
        planId: application.planId,
        actorId: userId,
      });
    }

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

  notify({
    userId: application.applicantId,
    kind: "APPLICATION_ACCEPTED",
    title: `You're in — ${application.plan.title}`,
    body: "The party room is open. Meet the crew before the night.",
    href: `/plans/${application.planId}/room`,
    planId: application.planId,
    actorId: userId,
  });

  return NextResponse.json(updated);
}

/** Host only, accepted guests only: the chip-in did (or didn't) arrive. */
async function confirmPayment(id: string, userId: string, paid: boolean) {
  const application = await prisma.application.findUnique({
    where: { id },
    select: { status: true, plan: { select: { hostId: true, chipIn: true } } },
  });
  if (!application) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (application.plan.hostId !== userId) {
    return NextResponse.json({ error: "not your plan" }, { status: 403 });
  }
  if (application.status !== "ACCEPTED" || !application.plan.chipIn) {
    return NextResponse.json({ error: "there's no chip-in to confirm here" }, { status: 409 });
  }
  const updated = await prisma.application.update({
    where: { id },
    data: { paidConfirmedAt: paid ? new Date() : null },
  });
  return NextResponse.json(updated);
}
