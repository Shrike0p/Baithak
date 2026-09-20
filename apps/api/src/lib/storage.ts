/**
 * Supabase Storage, over plain fetch.
 *
 * Deliberately not @supabase/supabase-js: the three calls we need (sign an
 * upload, delete an object, build a public URL) are plain HTTP, and the SDK
 * would be a megabyte of dependency for that. Swapping to R2/S3 later means
 * rewriting this file and nothing else — see
 * docs/superpowers/specs/2026-09-17-photo-upload-design.md.
 *
 * The service key bypasses row-level security, so it must never reach the
 * browser. Only this module reads it, and only the signed token — which is
 * scoped to one object path — is ever handed out.
 */

const URL_BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET;

function config() {
  if (!URL_BASE || !KEY || !BUCKET) {
    throw new Error(
      "Supabase storage is not configured — set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY " +
        "and SUPABASE_BUCKET in apps/api/.env.local",
    );
  }
  return { base: `${URL_BASE}/storage/v1`, key: KEY, bucket: BUCKET };
}

/** Where an uploaded object ends up being readable. The bucket is public. */
export function publicUrl(objectKey: string): string {
  const { base, bucket } = config();
  return `${base}/object/public/${bucket}/${objectKey}`;
}

/**
 * A one-object upload permit. The returned token encodes this exact path with
 * upsert:false, so a caller can't retarget it at someone else's photo or
 * overwrite an existing one — which is what lets us hand it to the browser.
 */
export async function signUpload(
  objectKey: string,
): Promise<{ objectKey: string; uploadUrl: string; publicUrl: string }> {
  const { base, key, bucket } = config();

  const res = await fetch(`${base}/object/upload/sign/${bucket}/${objectKey}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: "{}",
  });

  if (!res.ok) {
    throw new Error(`could not sign upload for ${objectKey}: ${res.status} ${await res.text()}`);
  }

  const { token } = (await res.json()) as { token: string };
  return {
    objectKey,
    uploadUrl: `${base}/object/upload/sign/${bucket}/${objectKey}?token=${token}`,
    publicUrl: publicUrl(objectKey),
  };
}

/**
 * Best-effort: a failure here leaves an orphaned object but must not stop the
 * database row from being deleted. The row is what the product can see; a
 * stranded blob is a storage bill, not a privacy leak, since the key is no
 * longer discoverable through any screen.
 */
export async function deleteObject(objectKey: string): Promise<void> {
  const { base, key, bucket } = config();
  await fetch(`${base}/object/${bucket}/${objectKey}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${key}` },
  }).catch(() => {});
}

/** The object key for a stored URL, or null if the URL isn't ours to delete. */
export function keyFromUrl(url: string): string | null {
  const { base, bucket } = config();
  const prefix = `${base}/object/public/${bucket}/`;
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}
