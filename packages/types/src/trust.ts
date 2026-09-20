/**
 * Trust score.
 *
 * Deliberately a plain, readable formula — not a model, not a secret. A host
 * deciding whether to let a stranger into their home deserves to know what the
 * number means, and the product plan's rule is that signals are always
 * explained rather than presented as a bare score.
 *
 * Scale is 0–5, because that's what every surface already renders as stars.
 *
 * Shape of the thing: showing up is the floor, other people's ratings are the
 * ceiling. Someone with no reviews can reach 3.5 by attending and hosting; only
 * reviews take you past that, and only bad ones drag you below.
 */

export interface TrustInput {
  plansAttended: number;
  plansHosted: number;
  /** Every rating anyone has given this person's nights, 1–5. */
  ratings: number[];
  /** Mutual "would hang out again" connections. */
  connections: number;
}

export interface TrustBreakdown {
  score: number;
  /** Plain-language reasons, in the order a host should read them. */
  reasons: string[];
}

/** Diminishing returns: the 20th party says much less than the 2nd. */
function showingUp(count: number, cap: number): number {
  if (count <= 0) return 0;
  return cap * (1 - Math.exp(-count / 4));
}

export function trustScore(input: TrustInput): TrustBreakdown {
  const { plansAttended, plansHosted, ratings, connections } = input;

  const attendance = showingUp(plansAttended, 1.5);
  const hosting = showingUp(plansHosted, 1.0);
  const mutuals = showingUp(connections, 0.5);

  // Ratings are the only part that can pull the score down. An unrated person
  // sits at the neutral 3, so a first bad review hurts and a first good one
  // helps, rather than one voice deciding everything.
  const rated = ratings.length > 0;
  const average = rated ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 3;
  // Confidence grows with volume: two reviews shouldn't swing as hard as ten.
  const confidence = Math.min(1, ratings.length / 6);
  const reputation = ((average - 3) / 2) * 2 * confidence;

  const score = Math.max(0, Math.min(5, attendance + hosting + mutuals + reputation + 1));

  const reasons: string[] = [];
  if (rated) {
    reasons.push(
      `Rated ${average.toFixed(1)} across ${ratings.length} night${ratings.length === 1 ? "" : "s"}`,
    );
  }
  if (plansHosted > 0) {
    reasons.push(`Has hosted ${plansHosted} time${plansHosted === 1 ? "" : "s"}`);
  }
  if (plansAttended > 0) {
    reasons.push(`Turned up to ${plansAttended} plan${plansAttended === 1 ? "" : "s"}`);
  }
  if (connections > 0) {
    reasons.push(
      `${connections} ${connections === 1 ? "person" : "people"} would hang out again`,
    );
  }
  if (reasons.length === 0) reasons.push("New here — no history yet");

  return { score: Math.round(score * 10) / 10, reasons };
}
