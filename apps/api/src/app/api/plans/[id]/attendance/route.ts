import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@baithak/db";
import { getCurrentUserId } from "@/lib/current-user";

/**
 * Leaving a plan you were accepted into.
 *
 * The seat is freed immediately so the host can fill it. A host can't leave
 * their own party — that's cancelling, which is a different thing with
 * different consequences for everyone else.
 */
export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/plans/[id]/attendance">) {
  const { id: planId } = await ctx.params;
  const userId = await getCurrentUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const attendee = await prisma.planAttendee.findFirst({
    where: { planId, userId },
    select: { id: true, role: true },
  });
  if (!attendee) return NextResponse.json({ error: "you're not in this plan" }, { status: 404 });
  if (attendee.role === "HOST") {
    return NextResponse.json(
      { error: "you're hosting this — cancel it instead" },
      { status: 409 },
    );
  }

  await prisma.planAttendee.delete({ where: { id: attendee.id } });

  // The application goes too, so leaving doesn't leave a stale "accepted" row
  // sitting in the host's queue.
  await prisma.application.deleteMany({ where: { planId, applicantId: userId } });

  return NextResponse.json({ ok: true });
}
