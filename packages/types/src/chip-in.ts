/**
 * A per-guest chip-in a host can ask for. Display only for now — guests pay the
 * host directly, so Baithak holds no money and needs no payments compliance.
 *
 * Capped so a plan stays a house party, not a ticketed event. Raise it once
 * there's a reason to.
 */
export const MAX_CHIP_IN = 2000;
export const MAX_CHIP_IN_NOTE = 60;

/** Whole rupees in range, or null for free. Anything unusable becomes free. */
export function parseChipIn(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n <= MAX_CHIP_IN ? n : null;
}

/** "₹300 chip-in", or "Free". */
export function chipInLabel(chipIn: number | null | undefined): string {
  return chipIn ? `₹${chipIn.toLocaleString("en-IN")} chip-in` : "Free";
}
