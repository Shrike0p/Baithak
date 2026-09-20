import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@baithak/db";
import { getCurrentUserId } from "@/lib/current-user";
import { profileStrength } from "@baithak/types";
import { deleteObject, keyFromUrl, publicUrl } from "@/lib/storage";
import { parseSocial } from "@/lib/social";

const GENDERS = ["WOMAN", "MAN", "NON_BINARY", "PREFER_NOT_TO_SAY"];

/**
 * Turns an uploaded object key into the stored avatar URL, and bins the old
 * one so a user never accumulates more than a single avatar in storage.
 *
 * Returns undefined to leave the avatar untouched. The client sends an object
 * key, never a URL — the URL is built here so an avatar can't be pointed at
 * an arbitrary address.
 */
async function nextImage(userId: string, objectKey: unknown, current: string | null) {
  if (objectKey === undefined) return undefined;
  if (objectKey === null) objectKey = "";
  if (typeof objectKey !== "string") return undefined;

  if (objectKey && !objectKey.startsWith(`avatars/${userId}/`)) return undefined;

  const previous = current && keyFromUrl(current);
  if (previous) await deleteObject(previous);

  return objectKey ? publicUrl(objectKey) : null;
}

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, image: true, age: true, city: true, occupation: true,
      socialUrl: true,
      gender: true, bio: true, vibeTags: true, trustScore: true, onboardedAt: true,
      _count: { select: { hostedPlans: true, attendances: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ ...user, strength: profileStrength(user) });
}

/** Onboarding and profile edits. Only ever writes the caller's own row. */
export async function PATCH(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const body = await request.json();
  const age = Number(body.age);
  const name = typeof body.name === "string" ? body.name.trim() : "";

  // Every field is patched only when present. A partial write — the profile
  // editor saving just a new avatar, say — must not blank out the rest, so
  // "absent" and "cleared" have to stay distinguishable.
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { image: true, onboardedAt: true },
  });

  const image = await nextImage(userId, body.image, existing?.image ?? null);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name ? { name } : {}),
      ...(body.age === undefined
        ? {}
        : { age: Number.isInteger(age) && age >= 18 && age <= 120 ? age : null }),
      city: typeof body.city === "string" ? body.city.trim() || null : undefined,
      occupation: typeof body.occupation === "string" ? body.occupation.trim() || null : undefined,
      bio: typeof body.bio === "string" ? body.bio.trim() || null : undefined,
      ...(body.gender === undefined ? {} : { gender: GENDERS.includes(body.gender) ? body.gender : null }),
      ...(image === undefined ? {} : { image }),
      // Empty string clears it; an unrecognised link is rejected rather than
      // silently stored, so nobody thinks they added a signal that isn't there.
      ...(body.socialUrl === undefined
        ? {}
        : { socialUrl: parseSocial(body.socialUrl)?.url ?? null }),
      vibeTags: Array.isArray(body.vibeTags)
        ? body.vibeTags.filter((t: unknown): t is string => typeof t === "string").slice(0, 12)
        : undefined,
      // trustScore is never settable by the client — it's earned, not claimed.
      // onboardedAt records when they first finished, so it's written once.
      ...(existing?.onboardedAt ? {} : { onboardedAt: new Date() }),
    },
    select: {
      id: true, name: true, image: true, age: true, city: true, occupation: true,
      socialUrl: true, gender: true, bio: true, vibeTags: true, onboardedAt: true,
    },
  });

  return NextResponse.json({ ...user, strength: profileStrength(user) });
}
