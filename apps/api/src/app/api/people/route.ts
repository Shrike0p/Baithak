import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@scene/db";
import { getCurrentUserId } from "@/lib/current-user";

export async function GET(request: NextRequest) {
  const userId = getCurrentUserId(request);

  const me = await prisma.user.findUnique({
    where: { id: userId },
    include: { attendances: { select: { planId: true } } },
  });
  if (!me) return NextResponse.json({ error: "not found" }, { status: 404 });

  const myPlanIds = me.attendances.map((a) => a.planId);

  const others = await prisma.user.findMany({
    where: { id: { not: userId } },
    include: {
      attendances: { select: { planId: true } },
      _count: { select: { hostedPlans: true } },
    },
  });

  const people = others.map((person) => {
    const theirPlanIds = person.attendances.map((a) => a.planId);
    const shared = theirPlanIds.filter((id) => myPlanIds.includes(id));
    const sharedVibes = person.vibeTags.filter((t) => me.vibeTags.includes(t));

    // Human-readable reasons, never a bare score — see docs/PRODUCT_PLAN.md §4.
    const reasons: string[] = [];
    if (sharedVibes.length) reasons.push(`You both like ${sharedVibes.join(" & ")}`);
    if (shared.length)
      reasons.push(`You've been to ${shared.length} of the same plan${shared.length > 1 ? "s" : ""}`);
    if (person._count.hostedPlans > 0)
      reasons.push(`Hosts their own plans · ★ ${person.trustScore.toFixed(1)}`);
    if (!reasons.length) reasons.push("New around here — say hi");

    return {
      id: person.id,
      name: person.name,
      age: person.age,
      city: person.city,
      occupation: person.occupation,
      vibeTags: person.vibeTags,
      trustScore: person.trustScore,
      plansAttended: theirPlanIds.length,
      plansHosted: person._count.hostedPlans,
      sharedPlans: shared.length,
      reasons,
    };
  });

  return NextResponse.json({
    met: people.filter((p) => p.sharedPlans > 0),
    suggested: people.filter((p) => p.sharedPlans === 0),
  });
}
