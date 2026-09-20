import { NextRequest, NextResponse } from "next/server";
import { prisma, type ReportReason } from "@baithak/db";
import { getCurrentUserId } from "@/lib/current-user";

const REASONS: ReportReason[] = [
  "HARASSMENT",
  "FAKE_PROFILE",
  "UNSAFE_BEHAVIOUR",
  "SPAM",
  "SOMETHING_ELSE",
];

/**
 * Filing a report. There's no moderation queue yet, so nothing happens
 * automatically — but the row exists, which is the difference between a
 * safety feature and a button that throws the evidence away.
 */
export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const reason = REASONS.includes(body.reason) ? (body.reason as ReportReason) : null;
  if (!reason) return NextResponse.json({ error: "pick a reason" }, { status: 400 });

  const subjectId = typeof body.subjectId === "string" ? body.subjectId : null;
  const planId = typeof body.planId === "string" ? body.planId : null;
  if (!subjectId && !planId) {
    return NextResponse.json({ error: "report a person or a plan" }, { status: 400 });
  }
  if (subjectId === userId) {
    return NextResponse.json({ error: "you can't report yourself" }, { status: 400 });
  }

  await prisma.report.create({
    data: {
      reporterId: userId,
      subjectId,
      planId,
      reason,
      detail: typeof body.detail === "string" ? body.detail.trim().slice(0, 1000) || null : null,
    },
  });

  // Reporting someone almost always means you don't want to see them either.
  if (subjectId && body.alsoBlock) {
    await prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: subjectId } },
      update: {},
      create: { blockerId: userId, blockedId: subjectId },
    });
  }

  return NextResponse.json({ ok: true });
}
