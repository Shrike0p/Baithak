/**
 * One social account, as a trust signal.
 *
 * Allowlisted rather than "any URL": the point is that a host can recognise
 * the platform and judge it. A link to an arbitrary domain proves nothing and
 * turns the profile into somewhere to advertise.
 *
 * This does not verify ownership — anyone can paste anyone's profile. It's a
 * signal, not proof, and the UI says so. Real verification would mean OAuth.
 */

const ALLOWED: Record<string, "linkedin" | "instagram" | "x"> = {
  "linkedin.com": "linkedin",
  "www.linkedin.com": "linkedin",
  "instagram.com": "instagram",
  "www.instagram.com": "instagram",
  "x.com": "x",
  "www.x.com": "x",
  "twitter.com": "x",
  "www.twitter.com": "x",
};

export interface Social {
  url: string;
  platform: "linkedin" | "instagram" | "x";
  handle: string;
}

/** Returns null for anything we won't store. */
export function parseSocial(input: unknown): Social | null {
  if (typeof input !== "string" || !input.trim()) return null;

  const raw = input.trim();
  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const platform = ALLOWED[url.hostname.toLowerCase()];
  if (!platform) return null;

  const handle = url.pathname.split("/").filter(Boolean).pop() ?? "";
  if (!handle) return null;

  // Rebuilt rather than echoed back, which drops tracking params and any
  // credentials someone pasted along with it.
  return {
    url: `https://${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`,
    platform,
    handle,
  };
}

/** For display beside a name, without making anyone parse a URL. */
export function describeSocial(url: string | null): Social | null {
  return url ? parseSocial(url) : null;
}
