/**
 * Neighbourhoods we suggest first.
 *
 * These used to be the only areas a plan could be in — liquidity is per-area,
 * and ten parties spread across Bangalore reads as dead while ten in
 * Koramangala reads as a scene. The restriction is lifted for now so hosts
 * anywhere can try it; these stay as the one-tap suggestions, and as the
 * canonical spelling free text snaps to.
 */
export const LAUNCH_AREAS = ["Koramangala", "Indiranagar", "HSR Layout"] as const;

export const MAX_AREA_LENGTH = 40;

/**
 * Tidies a typed area so the same place isn't stored three ways: trims,
 * collapses spaces, and snaps a case-insensitive match onto the suggested
 * spelling ("hsr  layout" → "HSR Layout"). Empty string if nothing usable.
 *
 * ponytail: exact matches only — "HSR" and "HSR Layout" stay separate areas.
 * An alias table is the upgrade if filters start fragmenting.
 */
export function normalizeArea(value: unknown): string {
  if (typeof value !== "string") return "";
  const tidy = value.trim().replace(/\s+/g, " ").slice(0, MAX_AREA_LENGTH);
  return LAUNCH_AREAS.find((a) => a.toLowerCase() === tidy.toLowerCase()) ?? tidy;
}
