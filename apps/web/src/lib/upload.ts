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

const MAX_EDGE = 2000;
const QUALITY = 0.82;

/**
 * Re-encodes to JPEG at a sane size. Two reasons beyond the storage bill:
 * iPhones shoot HEIC, which browsers won't render, and a 12MP original would
 * be rejected by the bucket's 5MB limit.
 *
 * Falls back to the original file if the browser can't decode it — better to
 * attempt the upload and get a clear error than to fail silently here.
 */
async function shrink(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
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
