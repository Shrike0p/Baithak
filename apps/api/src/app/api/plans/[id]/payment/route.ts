import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@baithak/db";
import { getCurrentUserId } from "@/lib/current-user";
import { notify } from "@/lib/notify";

/**
 * A guest saying "I've sent the chip-in".
 *
 * Baithak can't see a person-to-person UPI transfer, so this is a claim, not a
 * receipt — it tells the host to go check, and the host confirms on their desk.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/plans/[id]/payment">) {
  const { id: planId } = await ctx.params;
  const userId = await getCurrentUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const application = await prisma.application.findUnique({
    where: { planId_applicantId: { planId, applicantId: userId } },
    select: {
      id: true,
      status: true,
      paidClaimedAt: true,
      applicant: { select: { name: true } },
      plan: { select: { hostId: true, title: true, chipIn: true } },
    },
  });
  if (!application || application.status !== "ACCEPTED") {
    return NextResponse.json({ error: "you're not in this plan" }, { status: 404 });
  }
  if (!application.plan.chipIn) {
    return NextResponse.json({ error: "this plan has no chip-in" }, { status: 409 });
  }
  // Tapping twice shouldn't ping the host twice.
  if (application.paidClaimedAt) return NextResponse.json({ ok: true });

  await prisma.application.update({ where: { id: application.id }, data: { paidClaimedAt: new Date() } });
  notify({
    userId: application.plan.hostId,
    kind: "PAYMENT_CLAIMED",
    title: `${application.applicant.name} says they've paid`,
    body: `Check your UPI app for ₹${application.plan.chipIn}, then mark it on your desk.`,
    href: `/host?plan=${planId}`,
    planId,
    actorId: userId,
  });
  return NextResponse.json({ ok: true });
}

/**
 * Taking back an "I've paid" that was a mis-tap. Only until the host confirms —
 * after that it's their record, not the guest's to undo.
 */
export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/plans/[id]/payment">) {
  const { id: planId } = await ctx.params;
  const userId = await getCurrentUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const application = await prisma.application.findUnique({
    where: { planId_applicantId: { planId, applicantId: userId } },
    select: { id: true, status: true, paidConfirmedAt: true },
  });
  if (!application || application.status !== "ACCEPTED") {
    return NextResponse.json({ error: "you're not in this plan" }, { status: 404 });
  }
  if (application.paidConfirmedAt) {
    return NextResponse.json({ error: "the host has already confirmed it" }, { status: 409 });
  }
  await prisma.application.update({ where: { id: application.id }, data: { paidClaimedAt: null } });
  return NextResponse.json({ ok: true });
}
