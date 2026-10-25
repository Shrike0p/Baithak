"use client";

/**
 * Browser → storage, in three steps: shrink, ask apps/api for a one-object
 * permit, PUT the bytes straight to Supabase. The file never touches our API —
 * Vercel caps function request bodies at 4.5MB and phone photos exceed that.
 *
 * Callers get back an object key, not a URL. The URL is built server-side on
 * confirm, so a photo can never be pointed at an arbitrary address.
 */

export type UploadKind = "memory" | "avatar" | "cover";

/** Every upload lands under this. Decimal MB, so it's under 1MB however the bucket counts. */
export const MAX_UPLOAD_BYTES = 1_000_000;

const MAX_EDGE = 2000;
const QUALITY = 0.82;
const MIN_QUALITY = 0.5;

/**
 * Re-encodes to JPEG until it fits under MAX_UPLOAD_BYTES. Two reasons beyond
 * the storage bill: iPhones shoot HEIC, which browsers won't render, and phone
 * originals run 3–8MB. Quality drops first (cheap, barely visible down to
 * ~0.5), then the long edge shrinks by a quarter per round.
 *
 * Falls back to the original file if the browser can't decode it; uploadImage
 * then refuses it if that original is too big.
 */
async function shrink(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    let edge = Math.min(MAX_EDGE, Math.max(bitmap.width, bitmap.height));
    let quality = QUALITY;
    let blob: Blob | null = null;

    // ponytail: up to ~10 encodes on a huge photo; a binary search on quality
    // would be fewer, but this is a one-off per upload on the user's device.
    for (let round = 0; round < 10; round++) {
      const scale = edge / Math.max(bitmap.width, bitmap.height);
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (!blob || blob.size <= MAX_UPLOAD_BYTES) break;
      if (quality > MIN_QUALITY) quality = Math.max(MIN_QUALITY, quality - 0.1);
      else edge = Math.round(edge * 0.75);
    }
    bitmap.close();
    return blob ?? file;
  } catch {
    return file;
  }
}

/** The moment the photo was taken, if the file system knows it. */
export function takenAt(file: File): string | null {
  return file.lastModified ? new Date(file.lastModified).toISOString() : null;
}

export async function uploadImage(
  file: File,
  kind: UploadKind,
  planId?: string,
): Promise<{ objectKey: string }> {
  const blob = await shrink(file);
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error("That photo is too big — try a different one, or a screenshot of it.");
  }
  const contentType = blob.type || "image/jpeg";

  const permit = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, planId, contentType }),
  });
  if (!permit.ok) {
    const { error } = await permit.json().catch(() => ({ error: "upload refused" }));
    throw new Error(error ?? "upload refused");
  }

  const { objectKey, uploadUrl } = (await permit.json()) as {
    objectKey: string;
    uploadUrl: string;
  };

  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!put.ok) throw new Error("could not upload that photo");

  return { objectKey };
}
