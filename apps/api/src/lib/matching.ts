/**
 * Applicant ranking.
 *
 * A plain weighted formula, not a model. It decides the *order* the host reads
 * applicants in and nothing else — every accept and pass is still a manual tap
 * (see docs/PRODUCT_PLAN.md §20). The reasons matter more than the number: the
 * UI shows those and never the raw score.
 */

export interface MatchInput {
  applicantVibes: string[];
  planVibes: string[];
  trustScore: number;
  plansAttended: number;
  mutuals: number;
  returningToThisHost: boolean;
}

export interface MatchResult {
  score: number;
  reasons: string[];
}

export function scoreApplicant(input: MatchInput): MatchResult {
  const sharedVibes = input.applicantVibes.filter((v) => input.planVibes.includes(v));
  const reasons: string[] = [];

  // Capped so one strong signal can't drown out the others.
  const vibePoints = Math.min(sharedVibes.length, 3) * 12;
  const mutualPoints = Math.min(input.mutuals, 3) * 10;
  const trustPoints = (input.trustScore / 5) * 20;
  const returningPoints = input.returningToThisHost ? 14 : 0;

  if (sharedVibes.length) {
    reasons.push(
      `Into ${sharedVibes.slice(0, 3).join(", ")} — same as this plan`
    );
  }
  if (input.mutuals > 0) {
    reasons.push(
      `${input.mutuals} mutual connection${input.mutuals > 1 ? "s" : ""} already coming`
    );
  }
  if (input.returningToThisHost) {
    reasons.push("Has been to one of your plans before");
  }
  if (input.plansAttended === 0) {
    reasons.push("New here — no history yet");
  } else if (input.trustScore >= 4.5) {
    reasons.push(`★ ${input.trustScore.toFixed(1)} across ${input.plansAttended} plans`);
  }

  const score = Math.round(
    Math.min(100, vibePoints + mutualPoints + trustPoints + returningPoints)
  );

  return { score, reasons };
}

/** Which tab an applicant lands in on the host dashboard. */
export function bucketFor(
  status: string,
  score: number,
  plansAttended: number
): "best" | "good" | "new" | "later" {
  if (status === "REVIEW_LATER") return "later";
  if (plansAttended === 0) return "new";
  if (score >= 60) return "best";
  return "good";
}
