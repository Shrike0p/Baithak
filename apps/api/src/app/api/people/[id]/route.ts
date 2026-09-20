import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@baithak/db";
import { getCurrentUserId } from "@/lib/current-user";
import { describeSocial } from "@/lib/social";
import { hiddenUserIds } from "@/lib/blocks";
import { trustScore } from "@baithak/types";

/**
 * One person's public-facing profile.
 *
 * Signed-in only: guests never agreed to be shown to the anonymous internet,
 * and this is the page that names one. A blocked person 404s rather than 403s
 * — "no such person" leaks less than "you two can't see each other".
 *
 * Never returns email, exact addresses, or which specific plans they're in.
 * Shared history is a count, because naming a plan you weren't accepted to
 * would expose the guest list of someone else's party.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/people/[id]">) {
  const { id } = await ctx.params;
  const viewerId = await getCurrentUserId(request);
  if (!viewerId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const hidden = await hiddenUserIds(viewerId);
  if (hidden.includes(id)) return NextResponse.json({ error: "not found" }, { status: 404 });

  const person = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      image: true,
      age: true,
      city: true,
      occupation: true,
      bio: true,
      socialUrl: true,
      vibeTags: true,
      trustScore: true,
      createdAt: true,
      _count: { select: { hostedPlans: true, attendances: true } },
    },
  });
  if (!person) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [viewerPlans, theirPlans, hostedNights] = await Promise.all([
    prisma.planAttendee.findMany({
      where: { userId: viewerId, status: "CONFIRMED" },
      select: { planId: true },
    }),
    prisma.planAttendee.findMany({
      where: { userId: id, status: "CONFIRMED" },
      select: { planId: true },
    }),
    // A host's completed nights are already public in the archive.
    prisma.plan.findMany({
      where: { hostId: id, status: "COMPLETED" },
      orderBy: { startsAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        startsAt: true,
        imageUrl: true,
        neighborhood: true,
        _count: { select: { attendees: true, photos: true } },
      },
    }),
  ]);

  // The score is already stored; recomputing the *reasons* here is what lets
  // the profile explain it instead of showing a bare number.
  const [ratings, connections] = await Promise.all([
    person._count.hostedPlans > 0
      ? prisma.review.findMany({ where: { plan: { hostId: id } }, select: { hostRating: true } })
      : prisma.review.findMany({
          where: {
            plan: { attendees: { some: { userId: id, role: "GUEST", status: "CONFIRMED" } } },
            reviewerId: { not: id },
          },
          select: { crowdRating: true },
        }),
    prisma.connection.count({ where: { OR: [{ userAId: id }, { userBId: id }] } }),
  ]);

  const { reasons: trustReasons } = trustScore({
    plansAttended: person._count.attendances,
    plansHosted: person._count.hostedPlans,
    ratings: ratings.map((r) => ("hostRating" in r ? r.hostRating : r.crowdRating)),
    connections,
  });

  const mine = new Set(viewerPlans.map((p) => p.planId));
  const sharedPlans = theirPlans.filter((p) => mine.has(p.planId)).length;

  const viewer = await prisma.user.findUnique({
    where: { id: viewerId },
    select: { vibeTags: true },
  });
  const sharedVibes = person.vibeTags.filter((t) => viewer?.vibeTags.includes(t));

  return NextResponse.json({
    id: person.id,
    name: person.name,
    image: person.image,
    age: person.age,
    city: person.city,
    occupation: person.occupation,
    bio: person.bio,
    vibeTags: person.vibeTags,
    trustScore: person.trustScore,
    trustReasons,
    connections,
    social: describeSocial(person.socialUrl),
    plansHosted: person._count.hostedPlans,
    plansAttended: person._count.attendances,
    memberSince: person.createdAt,
    isYou: person.id === viewerId,
    sharedPlans,
    sharedVibes,
    nights: hostedNights.map((n) => ({
      id: n.id,
      title: n.title,
      startsAt: n.startsAt,
      imageUrl: n.imageUrl,
      neighborhood: n.neighborhood,
      people: n._count.attendees,
      photos: n._count.photos,
    })),
  });
}
