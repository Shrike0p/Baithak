/**
 * Profile completeness.
 *
 * Weighted by what actually helps a host decide, not by how many boxes are
 * filled. The split matters: the first 50% is what you *need* to apply at all
 * (a host can't judge a blank card), the rest is what makes them say yes.
 *
 * Shared so the API's gate and the UI's meter can never disagree.
 */

export interface ProfileInput {
  age?: number | null;
  city?: string | null;
  occupation?: string | null;
  bio?: string | null;
  socialUrl?: string | null;
  vibeTags?: string[] | null;
}

export interface ProfileStep {
  key: "basics" | "vibe" | "occupation" | "bio" | "social";
  label: string;
  /** What filling this in actually gets you — never "complete your profile". */
  payoff: string;
  weight: number;
  required: boolean;
  done: boolean;
}

export function profileSteps(user: ProfileInput): ProfileStep[] {
  return [
    {
      key: "basics",
      label: "Age and city",
      payoff: "Hosts set an age range for their crowd",
      weight: 20,
      required: true,
      done: Boolean(user.age && user.city?.trim()),
    },
    {
      key: "vibe",
      label: "Your vibe",
      payoff: "This is what matches you to the right plans",
      weight: 25,
      required: true,
      done: (user.vibeTags?.length ?? 0) >= 2,
    },
    {
      key: "social",
      label: "A social account",
      payoff: "Proof you exist elsewhere — the single biggest thing hosts look for",
      weight: 20,
      required: false,
      done: Boolean(user.socialUrl?.trim()),
    },
    {
      key: "occupation",
      label: "What you do",
      payoff: "Gives the crew something to open with",
      weight: 10,
      required: false,
      done: Boolean(user.occupation?.trim()),
    },
    {
      key: "bio",
      label: "A line about you",
      payoff: "Hosts are far more likely to accept people they can picture",
      weight: 25,
      required: false,
      done: Boolean(user.bio?.trim()),
    },
  ];
}

export interface ProfileStrength {
  percent: number;
  steps: ProfileStep[];
  /** Missing required steps — an application is pointless without these. */
  missingRequired: ProfileStep[];
  canApply: boolean;
  /** The single most valuable thing left to add. */
  nextUp: ProfileStep | null;
  /**
   * What a host sees when this profile lands in their queue. Stated as the
   * consequence rather than as a completeness score, because "60%" means
   * nothing and "hosts usually pass on this" means everything.
   */
  hostView: { tone: "thin" | "workable" | "strong"; message: string };
}

/** The steps a host is allowed to demand on top of the baseline. */
export const HOST_REQUIRABLE: ProfileStep["key"][] = ["social", "occupation", "bio"];

/**
 * Profile strength, optionally judged against one host's bar.
 *
 * `demanded` are step keys this host insists on for their own plan. They're
 * folded into `required` rather than checked separately so the gate, the meter
 * and the "what's missing" list can't drift apart — the whole reason this lives
 * in a shared package.
 */
export function profileStrength(
  user: ProfileInput,
  demanded: readonly string[] = [],
): ProfileStrength {
  const steps = profileSteps(user).map((step) =>
    demanded.includes(step.key) ? { ...step, required: true } : step,
  );
  const percent = steps.reduce((sum, s) => sum + (s.done ? s.weight : 0), 0);
  const missingRequired = steps.filter((s) => s.required && !s.done);
  const remaining = steps.filter((s) => !s.done);

  return {
    percent,
    steps,
    missingRequired,
    canApply: missingRequired.length === 0,
    hostView: hostView(percent, missingRequired.length > 0),
    // Required gaps first, then whatever is worth the most.
    nextUp:
      missingRequired[0] ??
      remaining.sort((a, b) => b.weight - a.weight)[0] ??
      null,
  };
}

/**
 * Deliberately blunt. A host scanning ten applications gives each a few
 * seconds, and a card with nothing on it loses to a card with something on it
 * — saying so is more useful than a progress ring.
 */
function hostView(percent: number, missingRequired: boolean): ProfileStrength["hostView"] {
  if (missingRequired || percent < 45) {
    return {
      tone: "thin",
      message:
        "Right now a host sees almost nothing about you. Most will pass rather than guess.",
    };
  }
  if (percent < 80) {
    return {
      tone: "workable",
      message:
        "A host can just about picture you. Adding one more thing is what usually tips a yes.",
    };
  }
  return {
    tone: "strong",
    message: "A host has enough here to say yes without wondering who you are.",
  };
}

/** Hinge-style prompts — far better signal than an empty "write a bio" box. */
export const BIO_PROMPTS = [
  "What are you bringing to the party?",
  "Best night out you've had in this city…",
  "You'll usually find me…",
  "The thing I'll talk about for hours…",
  "My go-to party trick…",
  "I'm the person who always…",
];
