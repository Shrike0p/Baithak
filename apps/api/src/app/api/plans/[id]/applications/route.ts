import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@scene/db";
import { getCurrentUserId } from "@/lib/current-user";
import { scoreApplicant, bucketFor } from "@/lib/matching";
import { composeCrew, groupHealth } from "@/lib/composition";

/** The host's applicant queue for one plan. Host only. */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/plans/[id]/applications">
) {
  const { id: planId } = await ctx.params;
  const userId = getCurrentUserId(request);

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: {
      crowd: true,
      attendees: {
        where: { status: "CONFIRMED" },
        include: { user: { select: { id: true, name: true, gender: true } } },
      },
    },
  });

  if (!plan) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (plan.hostId !== userId) {
    return NextResponse.json({ error: "not your plan" }, { status: 403 });
  }

  const applications = await prisma.application.findMany({
    where: { planId },
    orderBy: { createdAt: "desc" },
    include: {
      applicant: {
        include: {
          attendances: { select: { planId: true } },
          _count: { select: { hostedPlans: true } },
        },
      },
    },
  });

  // Who each applicant has already shared a room with, in two queries rather
  // than one per applicant.
  const applicantPlanIds = [
    ...new Set(applications.flatMap((a) => a.applicant.attendances.map((x) => x.planId))),
  ];
  const coAttendees = applicantPlanIds.length
    ? await prisma.planAttendee.findMany({
        where: { planId: { in: applicantPlanIds }, status: "CONFIRMED" },
        select: { planId: true, userId: true },
      })
    : [];

  const crewIds = new Set(plan.attendees.map((a) => a.userId));
  const hostPlanIds = new Set(
    (await prisma.plan.findMany({ where: { hostId: userId }, select: { id: true } })).map(
      (p) => p.id
    )
  );

  const ranked = applications.map((app) => {
    const theirPlanIds = app.applicant.attendances.map((a) => a.planId);
    const met = new Set(
      coAttendees
        .filter((c) => theirPlanIds.includes(c.planId) && c.userId !== app.applicantId)
        .map((c) => c.userId)
    );
    const mutuals = [...met].filter((id) => crewIds.has(id)).length;
    const returningToThisHost = theirPlanIds.some((id) => hostPlanIds.has(id));

    const { score, reasons } = scoreApplicant({
      applicantVibes: app.applicant.vibeTags,
      planVibes: plan.vibeTags,
      trustScore: app.applicant.trustScore,
      plansAttended: theirPlanIds.length,
      mutuals,
      returningToThisHost,
    });

    return {
      id: app.id,
      status: app.status,
      bringingWith: app.bringingWith,
      note: app.note,
      createdAt: app.createdAt,
      score,
      reasons,
      bucket: bucketFor(app.status, score, theirPlanIds.length),
      mutuals,
      returningToThisHost,
      applicant: {
        id: app.applicant.id,
        name: app.applicant.name,
        age: app.applicant.age,
        city: app.applicant.city,
        occupation: app.applicant.occupation,
        bio: app.applicant.bio,
        vibeTags: app.applicant.vibeTags,
        trustScore: app.applicant.trustScore,
        plansAttended: theirPlanIds.length,
        plansHosted: app.applicant._count.hostedPlans,
      },
    };
  });

  ranked.sort((a, b) => b.score - a.score);

  const composition = composeCrew(plan.attendees);

  return NextResponse.json({
    plan: {
      id: plan.id,
      title: plan.title,
      neighborhood: plan.neighborhood,
      startsAt: plan.startsAt,
      capacity: plan.capacity,
      imageUrl: plan.imageUrl,
      vibeTags: plan.vibeTags,
    },
    composition,
    groupHealth: groupHealth(composition, plan.capacity, plan.crowd, true),
    crowd: plan.crowd,
    applications: ranked,
  });
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/plans/[id]/applications">
) {
  const { id: planId } = await ctx.params;
  const applicantId = getCurrentUserId(request);
  const body = await request.json();

  const bringingWith = body.bringingWith ?? "SOLO";
  const note = typeof body.note === "string" ? body.note : null;

  const application = await prisma.application.upsert({
    where: { planId_applicantId: { planId, applicantId } },
    update: { bringingWith, note },
    create: { planId, applicantId, bringingWith, note },
  });

  return NextResponse.json(application, { status: 201 });
}
