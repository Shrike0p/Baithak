import { NextRequest, NextResponse } from "next/server";
import { prisma, type AttendAgain } from "@baithak/db";
import { getCurrentUserId } from "@/lib/current-user";
import { recomputeTrust, formMutualConnections } from "@/lib/trust";
import { notify } from "@/lib/notify";

const ATTEND_AGAIN: AttendAgain[] = ["YES", "MAYBE", "NO"];

const rating = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
};

/** What you already said about this night, so the form can show it. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/plans/[id]/review">) {
  const { id: planId } = await ctx.params;
  const userId = await getCurrentUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const review = await prisma.review.findUnique({
    where: { planId_reviewerId: { planId, reviewerId: userId } },
    include: { hangoutAgain: { select: { targetUserId: true } } },
  });

  return NextResponse.json(
    review
      ? { ...review, hangoutAgain: review.hangoutAgain.map((h) => h.targetUserId) }
      : null,
  );
}

/**
 * Reviewing a night you were at.
 *
 * Only attendees, only after it started, one per person per plan — editable,
 * because someone who rated in the taxi home should be able to think again.
 *
 * This is the thing that finally makes `trustScore` mean something.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/plans/[id]/review">) {
  const { id: planId } = await ctx.params;
  const userId = await getCurrentUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { hostId: true, startsAt: true, title: true, status: true },
  });
  if (!plan) return NextResponse.json({ error: "not found" }, { status: 404 });

  const attendee = await prisma.planAttendee.findFirst({
    where: { planId, userId, status: "CONFIRMED" },
    select: { id: true },
  });
  if (!attendee) return NextResponse.json({ error: "you weren't at this one" }, { status: 403 });

  if (plan.startsAt.getTime() > Date.now()) {
    return NextResponse.json({ error: "it hasn't happened yet" }, { status: 409 });
  }
  if (plan.hostId === userId) {
    return NextResponse.json({ error: "you can't review your own night" }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const hostRating = rating(body.hostRating);
  const crowdRating = rating(body.crowdRating);
  const vibeRating = rating(body.vibeRating);
  const safetyRating = rating(body.safetyRating);

  if (!hostRating || !crowdRating || !vibeRating || !safetyRating) {
    return NextResponse.json({ error: "every rating is 1 to 5" }, { status: 400 });
  }
  const attendAgain = ATTEND_AGAIN.includes(body.attendAgain) ? body.attendAgain : null;
  if (!attendAgain) return NextResponse.json({ error: "would you go again?" }, { status: 400 });

  // You can only pick people who were actually there, and not yourself.
  const crew = await prisma.planAttendee.findMany({
    where: { planId, status: "CONFIRMED", userId: { not: userId } },
    select: { userId: true },
  });
  const allowed = new Set(crew.map((c) => c.userId));
  const requested: string[] = Array.isArray(body.hangoutAgain)
    ? body.hangoutAgain.filter((p: unknown): p is string => typeof p === "string")
    : [];
  const picks = [...new Set(requested)].filter((p) => allowed.has(p));

  const data = {
    hostRating,
    crowdRating,
    vibeRating,
    safetyRating,
    attendAgain,
    privateNote:
      typeof body.privateNote === "string" ? body.privateNote.trim().slice(0, 2000) || null : null,
  };

  const review = await prisma.review.upsert({
    where: { planId_reviewerId: { planId, reviewerId: userId } },
    update: data,
    create: { planId, reviewerId: userId, ...data },
  });

  // Replaced wholesale rather than diffed — the set is small and an edit that
  // silently kept an old pick would be worse than a couple of extra writes.
  await prisma.hangoutAgain.deleteMany({ where: { reviewId: review.id } });
  if (picks.length > 0) {
    await prisma.hangoutAgain.createMany({
      data: picks.map((targetUserId) => ({ reviewId: review.id, targetUserId })),
    });
  }

  const mutual = await formMutualConnections(userId, picks);

  // Everyone whose score this could have moved.
  await Promise.all([
    recomputeTrust(plan.hostId),
    ...crew.map((c) => recomputeTrust(c.userId)),
    recomputeTrust(userId),
  ]);

  notify(
    mutual.map((other) => ({
      userId: other,
      kind: "NEW_PHOTOS" as const,
      title: "You both want to hang out again",
      body: `From ${plan.title}. You're connected now.`,
      href: `/people/${userId}`,
      planId,
      actorId: userId,
    })),
  );

  return NextResponse.json({ ok: true, mutualConnections: mutual.length });
}
