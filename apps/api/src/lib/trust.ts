import { prisma } from "@baithak/db";
import { trustScore } from "@baithak/types";

/**
 * Recompute one person's trust score from what's actually in the database.
 *
 * Run after anything that could change it — a review landing, a connection
 * forming. Cheap enough to just redo from scratch rather than maintain a
 * running total that can drift out of step with the rows it claims to describe.
 */
export async function recomputeTrust(userId: string): Promise<number> {
  const [user, hostedRatings, guestRatings, connections] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { _count: { select: { hostedPlans: true, attendances: true } } },
    }),
    // Ratings of nights this person hosted.
    prisma.review.findMany({
      where: { plan: { hostId: userId } },
      select: { hostRating: true },
    }),
    // A guest isn't rated individually — the crowd rating of the nights they
    // were at is the closest honest signal that people were glad they came.
    prisma.review.findMany({
      where: {
        plan: { attendees: { some: { userId, role: "GUEST", status: "CONFIRMED" } } },
        reviewerId: { not: userId },
      },
      select: { crowdRating: true },
    }),
    prisma.connection.count({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
    }),
  ]);

  if (!user) return 0;

  const isHost = user._count.hostedPlans > 0;
  const ratings = isHost
    ? hostedRatings.map((r) => r.hostRating)
    : guestRatings.map((r) => r.crowdRating);

  const { score } = trustScore({
    plansAttended: user._count.attendances,
    plansHosted: user._count.hostedPlans,
    ratings,
    connections,
  });

  await prisma.user.update({ where: { id: userId }, data: { trustScore: score } });
  return score;
}

/** Ids sorted, so a pair can only ever exist once and in one direction. */
export function pairKey(a: string, b: string): { userAId: string; userBId: string } {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

/**
 * Turns one-sided "I'd hang out again" picks into connections, but only where
 * both people picked each other. Being picked and not picking back is never
 * surfaced to anyone.
 */
export async function formMutualConnections(reviewerId: string, picks: string[]): Promise<string[]> {
  if (picks.length === 0) return [];

  const theirPicks = await prisma.hangoutAgain.findMany({
    where: {
      targetUserId: reviewerId,
      review: { reviewerId: { in: picks } },
    },
    select: { review: { select: { reviewerId: true } } },
  });

  const mutual = [...new Set(theirPicks.map((p) => p.review.reviewerId))];

  await Promise.all(
    mutual.map((other) =>
      prisma.connection.upsert({
        where: { userAId_userBId: pairKey(reviewerId, other) },
        update: {},
        create: { ...pairKey(reviewerId, other), source: "MUTUAL_HANGOUT_AGAIN" },
      }),
    ),
  );

  return mutual;
}
