import { NextRequest, NextResponse } from "next/server";
import { prisma, type PlanCategory, type ConnectionPreference } from "@baithak/db";
import {
  normalizeArea,
  parseChipIn,
  normalizeUpiId,
  MAX_CHIP_IN,
  MAX_CHIP_IN_NOTE,
  HOST_REQUIRABLE,
  MAX_RSVP_QUESTIONS,
  rsvpQuestion,
} from "@baithak/types";
import { getCurrentUserId } from "@/lib/current-user";
import { hiddenUserIds } from "@/lib/blocks";

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
  const hostId = await getCurrentUserId(request);
  if (!hostId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const body = await request.json();

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const neighborhood = normalizeArea(body.neighborhood);
  const exactAddress = typeof body.exactAddress === "string" ? body.exactAddress.trim() : "";
  const startsAt = new Date(body.startsAt);
  const capacity = Number(body.capacity);
  const category: PlanCategory = CATEGORIES.includes(body.category) ? body.category : "OTHER";
  const vibeTags = Array.isArray(body.vibeTags)
    ? body.vibeTags.filter((t: unknown): t is string => typeof t === "string")
    : [];

  if (!title || !neighborhood || !exactAddress) {
    return NextResponse.json(
      { error: "title, neighborhood and exact address are required" },
      { status: 400 },
    );
  }
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "startsAt must be a valid date" }, { status: 400 });
  }
  // A plan in the past can never appear in Discover, so creating one just
  // produces a party nobody can find.
  if (startsAt.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "that time has already passed — pick when it's actually happening" },
      { status: 400 },
    );
  }
  if (!Number.isInteger(capacity) || capacity < 2 || capacity > 100) {
    return NextResponse.json({ error: "capacity must be between 2 and 100" }, { status: 400 });
  }
  // The mix is a target for the same room, not a second guest list — 12 women
  // and 12 men at a party of 12 is a target nobody can ever hit.
  const targetWomen = num(body.crowd?.targetWomen) ?? 0;
  const targetMen = num(body.crowd?.targetMen) ?? 0;
  if (targetWomen + targetMen > capacity) {
    return NextResponse.json(
      { error: `that mix adds up to ${targetWomen + targetMen}, more than the ${capacity} spots` },
      { status: 400 },
    );
  }

  // Only the optional steps are a host's to demand; the baseline is ours, and
  // an unknown key would silently gate on something that can never be filled.
  const requiredOfGuests: string[] = Array.isArray(body.requiredOfGuests)
    ? body.requiredOfGuests.filter((k: unknown): k is string =>
        HOST_REQUIRABLE.includes(k as never),
      )
    : [];

  // Unknown ids are dropped rather than rejected — the catalogue can lose a
  // question and old clients shouldn't start failing to create plans.
  const rsvpQuestions: string[] = (Array.isArray(body.rsvpQuestions) ? body.rsvpQuestions : [])
    .filter((id: unknown): id is string => typeof id === "string" && Boolean(rsvpQuestion(id)))
    .slice(0, MAX_RSVP_QUESTIONS);

  // A typo'd amount must not silently become a free party — refuse it instead.
  const chipIn = parseChipIn(body.chipIn);
  if (chipIn === null && body.chipIn != null && body.chipIn !== "" && Number(body.chipIn) !== 0) {
    return NextResponse.json(
      { error: `the chip-in has to be a whole amount up to ₹${MAX_CHIP_IN}` },
      { status: 400 },
    );
  }
  const chipInNote =
    chipIn && typeof body.chipInNote === "string" && body.chipInNote.trim()
      ? body.chipInNote.trim().slice(0, MAX_CHIP_IN_NOTE)
      : null;

  // A chip-in without a way to pay it leaves guests asking around, so the
  // UPI ID is required with one — and a bad one is refused, not dropped.
  const upiId = chipIn ? normalizeUpiId(body.upiId) : null;
  if (chipIn && !upiId) {
    return NextResponse.json(
      { error: "add your UPI ID (like name@bank) so guests can pay the chip-in" },
      { status: 400 },
    );
  }

  const houseRules =
    typeof body.houseRules === "string" && body.houseRules.trim()
      ? body.houseRules.trim().slice(0, 1000)
      : null;

  const plan = await prisma.plan.create({
    data: {
      hostId,
      requiredOfGuests,
      rsvpQuestions,
      houseRules,
      chipIn,
      chipInNote,
      upiId,
      // Money changing hands means the host has to be able to reach people.
      askPhone: body.askPhone === true || Boolean(chipIn),
      title,
      category,
      vibeTags,
      neighborhood,
      exactAddress,
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

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  const hidden = await hiddenUserIds(userId);

  const plans = await prisma.plan.findMany({
    // A party that has already started isn't something you can join, whether or
    // not the host got round to wrapping it up. Discover shows what's ahead.
    where: {
      status: "OPEN",
      startsAt: { gte: new Date() },
      ...(hidden.length ? { hostId: { notIn: hidden } } : {}),
    },
    orderBy: { startsAt: "asc" },
    include: {
      host: { select: { id: true, name: true, image: true, trustScore: true } },
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
      chipIn: plan.chipIn,
      startsAt: plan.startsAt,
      capacity: plan.capacity,
      confirmedCount: plan._count.attendees,
      host: plan.host,
    }))
  );
}
