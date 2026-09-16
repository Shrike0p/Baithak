import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@scene/db";
import { getCurrentUserId } from "@/lib/current-user";

const planShape = {
  include: {
    host: { select: { id: true, name: true, trustScore: true } },
    _count: {
      select: {
        attendees: true,
        applications: { where: { status: { in: ["PENDING", "REVIEW_LATER"] } } },
      },
    },
  },
} as const;

type PlanWithHost = Awaited<ReturnType<typeof prisma.plan.findFirst<typeof planShape>>>;

function serialize(plan: NonNullable<PlanWithHost>) {
  return {
    id: plan.id,
    title: plan.title,
    category: plan.category,
    vibeTags: plan.vibeTags,
    neighborhood: plan.neighborhood,
    imageUrl: plan.imageUrl,
    startsAt: plan.startsAt,
    capacity: plan.capacity,
    confirmedCount: plan._count.attendees,
    pendingApplications: plan._count.applications,
    host: plan.host,
  };
}

export async function GET(request: NextRequest) {
  const userId = getCurrentUserId(request);

  const [hosting, attending, requested] = await Promise.all([
    prisma.plan.findMany({
      where: { hostId: userId, status: "OPEN" },
      orderBy: { startsAt: "asc" },
      ...planShape,
    }),
    prisma.plan.findMany({
      where: {
        status: "OPEN",
        attendees: { some: { userId, role: "GUEST", status: "CONFIRMED" } },
      },
      orderBy: { startsAt: "asc" },
      ...planShape,
    }),
    prisma.application.findMany({
      where: { applicantId: userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { plan: planShape },
    }),
  ]);

  return NextResponse.json({
    hosting: hosting.map(serialize),
    going: attending.map(serialize),
    requested: requested.map((a) => ({ ...serialize(a.plan), appliedAt: a.createdAt })),
  });
}
