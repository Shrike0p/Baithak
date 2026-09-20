import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@baithak/db";
import { getCurrentUserId } from "@/lib/current-user";
import { publicUrl } from "@/lib/storage";

/**
 * Confirms an upload that already landed in storage. Separate from the presign
 * because a browser can die mid-upload — an object with no row is a stray blob,
 * whereas a row with no object would be a broken Polaroid in the gallery.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/plans/[id]/photos">) {
  const { id: planId } = await ctx.params;
  const userId = await getCurrentUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const objectKey = typeof body.objectKey === "string" ? body.objectKey : "";

  // Re-check membership: the presign happened in a separate request, and the
  // caller could have been removed from the plan in between.
  const attendee = await prisma.planAttendee.findFirst({
    where: { planId, userId, status: "CONFIRMED" },
  });
  if (!attendee) return NextResponse.json({ error: "not in this plan" }, { status: 403 });

  // The key must be one we could have issued to this caller for this plan.
  // Without this, a confirm could attach any object in the bucket — including
  // another party's photo — to this album.
  if (!objectKey.startsWith(`memories/${planId}/`) || objectKey.includes("..")) {
    return NextResponse.json({ error: "bad object key" }, { status: 400 });
  }

  const takenAt = body.takenAt ? new Date(body.takenAt) : null;

  const photo = await prisma.photo.create({
    data: {
      planId,
      uploaderId: userId,
      // Built here, never taken from the client — otherwise a Photo row could
      // point anywhere on the internet.
      url: publicUrl(objectKey),
      caption: typeof body.caption === "string" ? body.caption.trim().slice(0, 140) || null : null,
      takenAt: takenAt && !Number.isNaN(takenAt.getTime()) ? takenAt : null,
    },
    include: { uploader: { select: { name: true } } },
  });

  return NextResponse.json({
    id: photo.id,
    url: photo.url,
    caption: photo.caption,
    takenAt: photo.takenAt,
    uploader: photo.uploader.name,
  });
}
