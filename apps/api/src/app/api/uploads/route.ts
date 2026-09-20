import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@baithak/db";
import { getCurrentUserId } from "@/lib/current-user";
import { signUpload } from "@/lib/storage";

/**
 * Every upload in the product passes through here, which makes this the one
 * place that decides who may write what. Bytes then go browser → Supabase
 * directly: Vercel caps function request bodies at 4.5MB and phone photos
 * exceed that, so proxying them through the API isn't an option.
 *
 * The caller never chooses the object key. It's derived from the kind and the
 * authorized ids, so nobody can write into another party's folder.
 */

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// A photo bomb is bounded by whichever of these bites first. Supabase's bucket
// rejects anything over 5MB on its own, so size needs no check here.
const MAX_PHOTOS_PER_PLAN = 100;
const MAX_UPLOADS_PER_HOUR = 30;

async function rateLimited(userId: string) {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.photo.count({ where: { uploaderId: userId, createdAt: { gte: since } } });
  return recent >= MAX_UPLOADS_PER_HOUR;
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const kind = body.kind;
  const planId = typeof body.planId === "string" ? body.planId : null;

  const ext = TYPES[body.contentType];
  if (!ext) {
    return NextResponse.json({ error: "only jpeg, png or webp images" }, { status: 415 });
  }

  let objectKey: string;

  if (kind === "memory") {
    if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 });

    // Same gate as the party room itself: only people who were actually
    // accepted into this plan can add to its album.
    const attendee = await prisma.planAttendee.findFirst({
      where: { planId, userId, status: "CONFIRMED" },
    });
    if (!attendee) return NextResponse.json({ error: "not in this plan" }, { status: 403 });

    if ((await prisma.photo.count({ where: { planId } })) >= MAX_PHOTOS_PER_PLAN) {
      return NextResponse.json({ error: "this album is full" }, { status: 409 });
    }
    if (await rateLimited(userId)) {
      return NextResponse.json({ error: "too many uploads, try later" }, { status: 429 });
    }

    objectKey = `memories/${planId}/${randomUUID()}.${ext}`;
  } else if (kind === "avatar") {
    // randomUUID rather than the user id: a stable key would be cached by the
    // CDN and the old face would keep showing after a change. The previous
    // object is deleted on confirm, so this stays at one avatar per user.
    //
    // ponytail: the hourly limit counts Photo rows, so it only covers
    // memories — a signed-in user could spam avatar/cover presigns and leave
    // orphaned objects. Bounded by the bucket's 5MB per file and nothing else.
    // Upgrade path if it ever matters: an Upload table, or a storage lifecycle
    // rule on objects never referenced by a row.
    objectKey = `avatars/${userId}/${randomUUID()}.${ext}`;
  } else if (kind === "cover") {
    if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 });

    const plan = await prisma.plan.findUnique({ where: { id: planId }, select: { hostId: true } });
    if (!plan) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (plan.hostId !== userId) {
      return NextResponse.json({ error: "only the host can change the cover" }, { status: 403 });
    }

    objectKey = `covers/${planId}/${randomUUID()}.${ext}`;
  } else {
    return NextResponse.json({ error: "unknown upload kind" }, { status: 400 });
  }

  const signed = await signUpload(objectKey);
  return NextResponse.json(signed);
}
