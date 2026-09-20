import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@baithak/db";
import { getCurrentUserId } from "@/lib/current-user";

/** Who you've blocked — so Settings can show you the list and undo it. */
export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const blocks = await prisma.block.findMany({
    where: { blockerId: userId },
    orderBy: { createdAt: "desc" },
    include: { blocked: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json(blocks.map((b) => ({ ...b.blocked, blockedAt: b.createdAt })));
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const { userId: target } = await request.json().catch(() => ({ userId: null }));
  if (typeof target !== "string" || !target) {
    return NextResponse.json({ error: "who?" }, { status: 400 });
  }
  if (target === userId) {
    return NextResponse.json({ error: "you can't block yourself" }, { status: 400 });
  }

  // Idempotent: blocking twice is a no-op rather than an error, because the
  // person tapping it twice is not in a mood to read an error message.
  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: userId, blockedId: target } },
    update: {},
    create: { blockerId: userId, blockedId: target },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const { userId: target } = await request.json().catch(() => ({ userId: null }));
  if (typeof target !== "string") return NextResponse.json({ error: "who?" }, { status: 400 });

  await prisma.block.deleteMany({ where: { blockerId: userId, blockedId: target } });
  return NextResponse.json({ ok: true });
}
