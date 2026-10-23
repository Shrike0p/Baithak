import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@baithak/db";
import { getCurrentUserId } from "@/lib/current-user";
import { scoreApplicant, bucketFor } from "@/lib/matching";
import { composeCrew, groupHealth } from "@/lib/composition";
import { profileStrength, rsvpQuestion } from "@baithak/types";
import { describeSocial } from "@/lib/social";
import { notify } from "@/lib/notify";

/** The host's applicant queue for one plan. Host only. */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/plans/[id]/applications">
) {
  const { id: planId } = await ctx.params;
  const userId = await getCurrentUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in required" }, { status: 401 });


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
      // Resolved to labels here rather than in the desk: the host should read
      // "How are you getting home? — Cab or rideshare", not a pair of ids.
      answers: Object.entries((app.answers ?? {}) as Record<string, string | string[]>)
        .map(([id, value]) => {
          const q = rsvpQuestion(id);
          return q
            ? { id, label: q.label, value: Array.isArray(value) ? value.join(", ") : value }
            : null;
        })
        .filter((a) => a !== null),
      agreedAt: app.agreedAt,
      createdAt: app.createdAt,
      score,
      reasons,
      bucket: bucketFor(app.status, score, theirPlanIds.length),
      mutuals,
      returningToThisHost,
      applicant: {
        id: app.applicant.id,
        name: app.applicant.name,
        image: app.applicant.image,
        social: describeSocial(app.applicant.socialUrl),
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
  const applicantId = await getCurrentUserId(request);
  if (!applicantId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  // A blank profile arrives in the host's queue with nothing to judge, gets
  // passed on, and the applicant never learns why. Better to stop it here and
  // say what's missing.
  const [applicant, gate] = await Promise.all([
    prisma.user.findUnique({
      where: { id: applicantId },
      select: { name: true, age: true, city: true, occupation: true, bio: true, socialUrl: true, vibeTags: true },
    }),
    prisma.plan.findUnique({
      where: { id: planId },
      select: { requiredOfGuests: true, rsvpQuestions: true, houseRules: true },
    }),
  ]);
  const strength = applicant ? profileStrength(applicant, gate?.requiredOfGuests ?? []) : null;
  if (!strength?.canApply) {
    return NextResponse.json(
      {
        error: "profile incomplete",
        message: (gate?.requiredOfGuests.length ?? 0)
          ? "This host asks for a bit more before they'll consider you."
          : "Hosts need to know who they'd be letting in.",
        missing: strength?.missingRequired.map((s) => s.key) ?? ["basics", "vibe"],
      },
      { status: 422 }
    );
  }

  const body = await request.json();

  const bringingWith = body.bringingWith ?? "SOLO";
  const note = typeof body.note === "string" ? body.note : null;

  // House rules are a norm, not decoration — an unticked box is a refusal.
  if (gate?.houseRules && body.agreed !== true) {
    return NextResponse.json(
      { error: "house rules", message: "Tick the house rules to send this." },
      { status: 422 },
    );
  }

  // Keep only answers to questions this host actually asked, so a client can't
  // stuff arbitrary text onto an application.
  const asked = gate?.rsvpQuestions ?? [];
  const submitted = (body.answers ?? {}) as Record<string, unknown>;
  const answers: Record<string, string | string[]> = {};
  const unanswered: string[] = [];
  for (const id of asked) {
    const q = rsvpQuestion(id);
    if (!q) continue;
    const value = submitted[id];
    if (q.kind === "multi") {
      const picked = Array.isArray(value)
        ? value.filter((v): v is string => typeof v === "string").slice(0, q.maxChoices ?? 2)
        : [];
      if (picked.length === 0) unanswered.push(id);
      else answers[id] = picked;
    } else {
      const text = typeof value === "string" ? value.trim().slice(0, 300) : "";
      if (!text) unanswered.push(id);
      else answers[id] = text;
    }
  }
  if (unanswered.length > 0) {
    return NextResponse.json(
      { error: "unanswered", message: "The host asked a couple of things first.", unanswered },
      { status: 422 },
    );
  }

  const application = await prisma.application.upsert({
    where: { planId_applicantId: { planId, applicantId } },
    update: { bringingWith, note, answers, agreedAt: gate?.houseRules ? new Date() : null },
    create: {
      planId,
      applicantId,
      bringingWith,
      note,
      answers,
      agreedAt: gate?.houseRules ? new Date() : null,
    },
  });

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { hostId: true, title: true },
  });
  if (plan) {
    notify({
      userId: plan.hostId,
      kind: "NEW_APPLICANT",
      title: `${applicant?.name ?? "Someone"} wants in`,
      body: plan.title,
      href: `/host?plan=${planId}`,
      planId,
      actorId: applicantId,
    });
  }

  return NextResponse.json(application, { status: 201 });
}
