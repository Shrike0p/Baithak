import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@scene/db";
import { getCurrentUserId } from "@/lib/current-user";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/plans/[id]/applications">
) {
  const { id: planId } = await ctx.params;
  const applicantId = getCurrentUserId(request);
  const body = await request.json();

  const bringingWith = body.bringingWith ?? "SOLO";
  const note = typeof body.note === "string" ? body.note : null;

  const application = await prisma.application.upsert({
    where: { planId_applicantId: { planId, applicantId } },
    update: { bringingWith, note },
    create: { planId, applicantId, bringingWith, note },
  });

  return NextResponse.json(application, { status: 201 });
}
