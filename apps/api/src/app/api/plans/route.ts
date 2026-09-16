import { NextRequest, NextResponse } from "next/server";
import { prisma, type PlanCategory, type ConnectionPreference } from "@scene/db";
import { getCurrentUserId } from "@/lib/current-user";

const CONNECTION_PREFS: ConnectionPreference[] = [
  "FRIENDS_OF_FRIENDS",
  "COMMUNITY",
  "OPEN",
  "INVITE_ONLY",
];

/** Optional positive integer, or null when absent/invalid. */
function num(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 100 ? n : null;
}

const CATEGORIES: PlanCategory[] = [
  "HOUSE_PARTY",
  "DRINKS",
  "DINNER",
  "GAME_NIGHT",
  "MOVIE",
  "SPORTS",
  "TRIP",
  "OTHER",
];

export async function POST(request: NextRequest) {
  const hostId = getCurrentUserId(request);
  const body = await request.json();

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const neighborhood = typeof body.neighborhood === "string" ? body.neighborhood.trim() : "";
  const startsAt = new Date(body.startsAt);
  const capacity = Number(body.capacity);
  const category: PlanCategory = CATEGORIES.includes(body.category) ? body.category : "OTHER";
  const vibeTags = Array.isArray(body.vibeTags)
    ? body.vibeTags.filter((t: unknown): t is string => typeof t === "string")
    : [];

  if (!title || !neighborhood) {
    return NextResponse.json({ error: "title and neighborhood are required" }, { status: 400 });
  }
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "startsAt must be a valid date" }, { status: 400 });
  }
  if (!Number.isInteger(capacity) || capacity < 2 || capacity > 100) {
    return NextResponse.json({ error: "capacity must be between 2 and 100" }, { status: 400 });
  }

  const plan = await prisma.plan.create({
    data: {
      hostId,
      title,
      category,
      vibeTags,
      neighborhood,
      exactAddress: typeof body.exactAddress === "string" ? body.exactAddress.trim() : null,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl.trim() : null,
      startsAt,
      capacity,
      attendees: { create: { userId: hostId, role: "HOST", firstTime: false } },
      // Targets only — they drive the group-health nudge, never a filter.
      crowd: body.crowd
        ? {
            create: {
              ageMin: num(body.crowd.ageMin),
              ageMax: num(body.crowd.ageMax),
              preferredVibes: Array.isArray(body.crowd.preferredVibes)
                ? body.crowd.preferredVibes.filter((t: unknown): t is string => typeof t === "string")
                : [],
              targetWomen: num(body.crowd.targetWomen),
              targetMen: num(body.crowd.targetMen),
              targetCouples: num(body.crowd.targetCouples),
              connectionPreference: CONNECTION_PREFS.includes(body.crowd.connectionPreference)
                ? body.crowd.connectionPreference
                : "OPEN",
            },
          }
        : undefined,
    },
  });

  return NextResponse.json(plan, { status: 201 });
}

export async function GET() {
  const plans = await prisma.plan.findMany({
    where: { status: "OPEN" },
    orderBy: { startsAt: "asc" },
    include: {
      host: { select: { id: true, name: true, trustScore: true } },
      _count: { select: { attendees: true } },
    },
  });

  return NextResponse.json(
    plans.map((plan) => ({
      id: plan.id,
      title: plan.title,
      category: plan.category,
      vibeTags: plan.vibeTags,
      neighborhood: plan.neighborhood,
      imageUrl: plan.imageUrl,
      startsAt: plan.startsAt,
      capacity: plan.capacity,
      confirmedCount: plan._count.attendees,
      host: plan.host,
    }))
  );
}
