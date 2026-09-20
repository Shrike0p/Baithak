import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@baithak/db";
import { getCurrentUserId } from "@/lib/current-user";
import { deleteObject, keyFromUrl } from "@/lib/storage";

/**
 * Uploader or host. The uploader owns what they shared; the host owns the
 * album, because a trust-first product can't leave someone unable to take down
 * a photo from their own party. People pictured in a photo can't remove it —
 * that needs tagging, which this build doesn't have.
 */
export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/photos/[id]">) {
  const { id } = await ctx.params;
  const userId = await getCurrentUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const photo = await prisma.photo.findUnique({
    where: { id },
    select: { id: true, url: true, uploaderId: true, plan: { select: { hostId: true } } },
  });
  if (!photo) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (photo.uploaderId !== userId && photo.plan.hostId !== userId) {
    return NextResponse.json({ error: "not yours to delete" }, { status: 403 });
  }

  // Row first: it's what every screen reads, so the photo disappears from the
  // product even if storage is having a bad day.
  await prisma.photo.delete({ where: { id } });

  const key = keyFromUrl(photo.url);
  if (key) await deleteObject(key);

  return NextResponse.json({ ok: true });
}

/**
 * The host marking one of their own photos as public, for the teaser on a
 * wrapped-up party.
 *
 * Scoped to photos the host uploaded. A guest's photo of a private house party
 * is theirs to keep private — the host advertising their own night is
 * consenting on their own behalf, and can't consent for anyone else.
 */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/photos/[id]">) {
  const { id } = await ctx.params;
  const userId = await getCurrentUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const photo = await prisma.photo.findUnique({
    where: { id },
    select: { uploaderId: true, plan: { select: { hostId: true } } },
  });
  if (!photo) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (photo.plan.hostId !== userId || photo.uploaderId !== userId) {
    return NextResponse.json(
      { error: "only the host can publish, and only their own photos" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const updated = await prisma.photo.update({
    where: { id },
    data: { isPublic: Boolean(body.isPublic) },
    select: { id: true, isPublic: true },
  });

  return NextResponse.json(updated);
}
