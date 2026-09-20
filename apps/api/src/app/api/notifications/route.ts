import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@baithak/db";
import { getCurrentUserId } from "@/lib/current-user";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return NextResponse.json({ items, unread });
}

/** Marks everything read. Per-item read state isn't worth the round trips. */
export async function PATCH(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
