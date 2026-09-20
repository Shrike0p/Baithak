import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@baithak/db";
import { getCurrentUserId } from "@/lib/current-user";
import { hiddenUserIds } from "@/lib/blocks";

const MAX_LENGTH = 2000;
const MAX_PER_MINUTE = 20;

/** Only people actually in the plan. Same gate as the room itself. */
async function requireAttendee(planId: string, userId: string) {
  return prisma.planAttendee.findFirst({
    where: { planId, userId, status: "CONFIRMED" },
    select: { id: true },
  });
}

/**
 * The messages, newest last.
 *
 * `since` makes this cheap to poll: the client sends the timestamp of the last
 * message it has and gets back only what's newer, so a quiet room costs an
 * empty array rather than the whole history.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/plans/[id]/messages">) {
  const { id: planId } = await ctx.params;
  const userId = await getCurrentUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  if (!(await requireAttendee(planId, userId))) {
    return NextResponse.json({ error: "not in this plan" }, { status: 403 });
  }

  const sinceParam = request.nextUrl.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : null;
  const hidden = await hiddenUserIds(userId);

  const messages = await prisma.message.findMany({
    where: {
      planId,
      ...(since && !Number.isNaN(since.getTime()) ? { createdAt: { gt: since } } : {}),
      // You don't have to read someone you blocked just because you're both in
      // the room, and blocks cut both ways — so neither of you sees the other's
      // messages, and neither is told. It leaves a conversation with holes in
      // it for both people, which is the honest cost of a silent block in a
      // group. If that proves confusing, the fix is a "message hidden"
      // placeholder rather than making blocks one-directional.
      ...(hidden.length ? { senderId: { notIn: hidden } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: { sender: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json(
    messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
      isYou: m.senderId === userId,
      sender: m.sender,
    })),
  );
}

export async function POST(request: NextRequest, ctx: RouteContext<"/api/plans/[id]/messages">) {
  const { id: planId } = await ctx.params;
  const userId = await getCurrentUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  if (!(await requireAttendee(planId, userId))) {
    return NextResponse.json({ error: "not in this plan" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) return NextResponse.json({ error: "say something" }, { status: 400 });
  if (text.length > MAX_LENGTH) {
    return NextResponse.json({ error: "that's too long" }, { status: 413 });
  }

  const recent = await prisma.message.count({
    where: { senderId: userId, createdAt: { gte: new Date(Date.now() - 60_000) } },
  });
  if (recent >= MAX_PER_MINUTE) {
    return NextResponse.json({ error: "slow down a second" }, { status: 429 });
  }

  const message = await prisma.message.create({
    data: { planId, senderId: userId, body: text },
    include: { sender: { select: { id: true, name: true, image: true } } },
  });

  // Deliberately no notification per message — a chat that pings everyone for
  // every line is a chat people mute.
  return NextResponse.json({
    id: message.id,
    body: message.body,
    createdAt: message.createdAt,
    isYou: true,
    sender: message.sender,
  });
}
