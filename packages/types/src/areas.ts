/**
 * The only neighbourhoods Baithak is open in.
 *
 * Deliberately three, not "Bangalore". A house-party app dies on empty rooms,
 * and liquidity is per-area, not per-city: ten parties spread across Bangalore
 * reads as dead, while ten in Koramangala reads as a scene. Free text also
 * fragments the same place into "HSR", "hsr layout" and "HSR Layout", which
 * makes an area filter useless and the "3 plans near you" count a lie.
 *
 * Opening a fourth area is a deliberate act — add it here once that area
 * actually has hosts, not before.
 */
export const LAUNCH_AREAS = ["Koramangala", "Indiranagar", "HSR Layout"] as const;

export type LaunchArea = (typeof LAUNCH_AREAS)[number];

export function isLaunchArea(value: unknown): value is LaunchArea {
  return typeof value === "string" && (LAUNCH_AREAS as readonly string[]).includes(value);
}
