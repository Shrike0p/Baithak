import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@baithak/db";
import { getCurrentUserId } from "@/lib/current-user";

const planInclude = {
  host: { select: { id: true, name: true, image: true, trustScore: true } },
  _count: { select: { attendees: true } },
};

type PlanRow = Awaited<
  ReturnType<typeof prisma.plan.findMany<{ include: typeof planInclude }>>
>[number];

function serialize(plan: PlanRow, pendingApplications = 0) {
  return {
    id: plan.id,
    status: plan.status,
    title: plan.title,
    category: plan.category,
    vibeTags: plan.vibeTags,
    neighborhood: plan.neighborhood,
    imageUrl: plan.imageUrl,
    chipIn: plan.chipIn,
    startsAt: plan.startsAt,
    capacity: plan.capacity,
    confirmedCount: plan._count.attendees,
    pendingApplications,
    host: plan.host,
  };
}

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const [hosting, attending, requested, past] = await Promise.all([
    prisma.plan.findMany({
      where: { hostId: userId, status: "OPEN" },
      orderBy: { startsAt: "asc" },
      include: planInclude,
    }),
    prisma.plan.findMany({
      where: {
        status: "OPEN",
        attendees: { some: { userId, role: "GUEST", status: "CONFIRMED" } },
      },
      orderBy: { startsAt: "asc" },
      include: planInclude,
    }),
    prisma.application.findMany({
      where: { applicantId: userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { plan: { include: planInclude } },
    }),
    // Nights you were part of, however they ended. A cancelled plan stays
    // here on purpose — it's how someone finds out it's off.
    prisma.plan.findMany({
      where: {
        AND: [
          { OR: [{ hostId: userId }, { attendees: { some: { userId, status: "CONFIRMED" } } }] },
          {
            OR: [
              { status: { in: ["COMPLETED", "CANCELLED"] } },
              { startsAt: { lt: new Date() } },
            ],
          },
        ],
      },
      orderBy: { startsAt: "desc" },
      take: 20,
      include: planInclude,
    }),
  ]);

  // How many people are waiting on each plan you host — drives the host desk's
  // default selection. One grouped query rather than a count per plan.
  const waiting = hosting.length
    ? await prisma.application.groupBy({
        by: ["planId"],
        where: {
          planId: { in: hosting.map((p) => p.id) },
          status: { in: ["PENDING", "REVIEW_LATER"] },
        },
        _count: { _all: true },
      })
    : [];
  const pendingByPlan = new Map(waiting.map((w) => [w.planId, w._count._all]));

  return NextResponse.json({
    hosting: hosting.map((p) => serialize(p, pendingByPlan.get(p.id) ?? 0)),
    going: attending.map((p) => serialize(p)),
    requested: requested.map((a) => ({ ...serialize(a.plan), appliedAt: a.createdAt })),
    past: past.map((p) => serialize(p)),
  });
}
