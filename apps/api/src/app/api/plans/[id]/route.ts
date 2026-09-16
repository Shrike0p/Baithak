import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@scene/db";
import { getCurrentUserId } from "@/lib/current-user";
import { composeCrew, groupHealth } from "@/lib/composition";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/plans/[id]">) {
  const { id } = await ctx.params;
  const userId = getCurrentUserId(request);

  const plan = await prisma.plan.findUnique({
    where: { id },
    include: {
      host: { select: { id: true, name: true, bio: true, trustScore: true } },
      crowd: true,
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
            },
          },
        },
      },
    },
  });

  if (!plan) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const viewerIsConfirmedAttendee = plan.attendees.some((a) => a.userId === userId);
  const isHost = plan.hostId === userId;
  const composition = composeCrew(plan.attendees);

  return NextResponse.json({
    id: plan.id,
    title: plan.title,
    category: plan.category,
    vibeTags: plan.vibeTags,
    neighborhood: plan.neighborhood,
    imageUrl: plan.imageUrl,
    // exact address only ever leaves the API for confirmed attendees — see docs/ARCHITECTURE.md flow 2.4
    exactAddress: viewerIsConfirmedAttendee ? plan.exactAddress : null,
    startsAt: plan.startsAt,
    capacity: plan.capacity,
    host: plan.host,
    isHost,
    composition,
    groupHealth: groupHealth(composition, plan.capacity, plan.crowd, isHost),
    // The host's preferred mix / age range is their own planning data.
    crowd: isHost ? plan.crowd : null,
    crew: plan.attendees.map((a) => ({
      role: a.role,
      firstTime: a.firstTime,
      user: {
        ...a.user,
        // Individual gender is never exposed — it only feeds the aggregate above.
        gender: undefined,
      },
    })),
  });
}
