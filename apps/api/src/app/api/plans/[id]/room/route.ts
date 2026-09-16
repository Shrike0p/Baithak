import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@scene/db";
import { getCurrentUserId } from "@/lib/current-user";
import { composeCrew } from "@/lib/composition";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/plans/[id]/room">) {
  const { id } = await ctx.params;
  const userId = getCurrentUserId(request);

  const plan = await prisma.plan.findUnique({
    where: { id },
    include: {
      host: { select: { id: true, name: true, bio: true, trustScore: true } },
      attendees: {
        where: { status: "CONFIRMED" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              age: true,
              city: true,
              occupation: true,
              gender: true,
              vibeTags: true,
              trustScore: true,
              _count: { select: { attendances: true } },
            },
          },
        },
      },
      photos: { orderBy: { takenAt: "asc" }, include: { uploader: { select: { name: true } } } },
    },
  });

  if (!plan) return NextResponse.json({ error: "not found" }, { status: 404 });

  // The party room is private to confirmed attendees — this is the gate that
  // also protects the exact address and everyone's profile details.
  const me = plan.attendees.find((a) => a.userId === userId);
  if (!me) return NextResponse.json({ error: "not in this plan" }, { status: 403 });

  const composition = composeCrew(plan.attendees);
  const myVibes = me.user.vibeTags;

  // Previous nights by the same host — social proof inside the room.
  const previousNights = await prisma.plan.findMany({
    where: { hostId: plan.hostId, status: "COMPLETED", id: { not: plan.id } },
    orderBy: { startsAt: "desc" },
    take: 4,
    include: { _count: { select: { attendees: true, photos: true } } },
  });

  return NextResponse.json({
    id: plan.id,
    title: plan.title,
    neighborhood: plan.neighborhood,
    exactAddress: plan.exactAddress,
    startsAt: plan.startsAt,
    capacity: plan.capacity,
    status: plan.status,
    imageUrl: plan.imageUrl,
    host: plan.host,
    isHost: plan.hostId === userId,
    composition,
    crew: plan.attendees.map((a) => ({
      role: a.role,
      firstTime: a.firstTime,
      isYou: a.userId === userId,
      user: {
        id: a.user.id,
        name: a.user.name,
        age: a.user.age,
        city: a.user.city,
        occupation: a.user.occupation,
        vibeTags: a.user.vibeTags,
        trustScore: a.user.trustScore,
        plansAttended: a.user._count.attendances,
        // Explained, never a bare score — see docs/PRODUCT_PLAN.md §4.
        sharedVibes: a.user.vibeTags.filter((t) => myVibes.includes(t)),
      },
    })),
    memories: plan.photos.map((p) => ({
      id: p.id,
      url: p.url,
      caption: p.caption,
      takenAt: p.takenAt,
      uploader: p.uploader.name,
    })),
    previousNights: previousNights.map((p) => ({
      id: p.id,
      title: p.title,
      startsAt: p.startsAt,
      imageUrl: p.imageUrl,
      people: p._count.attendees,
      photos: p._count.photos,
    })),
  });
}
