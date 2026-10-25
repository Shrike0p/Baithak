/**
 * Screening questions a host can put in front of an applicant.
 *
 * A catalogue, not a form builder. Hosts pick from a fixed list rather than
 * authoring arbitrary fields, which buys three things a builder doesn't: the
 * answers are comparable across plans (every "getting home" answer means the
 * same thing), the applicant desk can render them without interpreting a
 * schema, and nobody ships a party form asking for someone's Aadhaar number.
 *
 * Anything already on the profile or the application — headcount, age, vibe,
 * the intro note — is deliberately absent. Asking twice is how forms get long
 * enough that people abandon them.
 */

export type RsvpQuestionId =
  | "dietary"
  | "alcohol"
  | "gettingHome"
  | "accessibility"
  | "partyVibe"
  | "newToCity"
  | "lookingFor"
  | "strangers";

export interface RsvpQuestion {
  id: RsvpQuestionId;
  /** What the guest is asked. */
  label: string;
  /** Why a host would turn this on — shown to the host, never the guest. */
  payoff: string;
  group: "Food & drinks" | "Safety & logistics" | "Vibe & fit";
  kind: "choice" | "multi" | "text";
  options?: string[];
  /** At most this many for `multi` — long answers stop being comparable. */
  maxChoices?: number;
}

export const RSVP_QUESTIONS: RsvpQuestion[] = [
  {
    id: "dietary",
    label: "Anything you don't eat?",
    payoff: "Only worth asking if you're feeding people",
    group: "Food & drinks",
    kind: "choice",
    options: ["No restrictions", "Vegetarian", "Vegan", "Egg-only", "Jain", "Allergies — I'll say in the note"],
  },
  {
    id: "alcohol",
    label: "Will you drink?",
    payoff: "Tells you how much to buy, and flags a dry crowd early",
    group: "Food & drinks",
    kind: "choice",
    options: ["Yes", "No", "Maybe"],
  },
  {
    id: "gettingHome",
    label: "How are you getting home?",
    payoff: "The one question that prevents someone riding home drunk",
    group: "Safety & logistics",
    kind: "choice",
    options: ["Cab or rideshare", "Own vehicle", "Walking — I'm nearby", "Friend's ride", "Not sure yet"],
  },
  {
    id: "accessibility",
    label: "Anything that'd make the space easier for you?",
    payoff: "Stairs, seating, noise — cheap to ask, awful to discover on the night",
    group: "Safety & logistics",
    kind: "text",
  },
  {
    id: "strangers",
    label: "How do you feel about a room of strangers?",
    payoff: "Separates people who want a mixer from people expecting a friends' hang",
    group: "Vibe & fit",
    kind: "choice",
    options: [
      "Love it — that's why I'm here",
      "Fine, if there's something to do",
      "I'd rather it were friends-of-friends",
    ],
  },
  {
    id: "partyVibe",
    label: "What's your usual party mode?",
    payoff: "Stops a games night filling up with people who came to dance",
    group: "Vibe & fit",
    kind: "multi",
    maxChoices: 2,
    options: ["Chill conversations", "Music and dancing", "Games and activities", "Drinking and mingling", "Early night, low-key"],
  },
  {
    id: "newToCity",
    label: "Are you new to the city?",
    payoff: "If you want to host newcomers, this is how you find them",
    group: "Vibe & fit",
    kind: "choice",
    options: ["Moved in the last 6 months", "Here a while now", "I'm local"],
  },
  {
    id: "lookingFor",
    label: "What are you hoping to get out of it?",
    payoff: "Sorts a social night from a networking one before anyone turns up",
    group: "Vibe & fit",
    kind: "multi",
    maxChoices: 2,
    options: ["Make new friends", "Meet people in my field", "Just a fun night out", "Find flatmates", "See what happens"],
  },
];

/** A sensible starting set for a host who doesn't want to think about it. */
export const DEFAULT_RSVP_QUESTIONS: RsvpQuestionId[] = ["gettingHome", "strangers"];

/**
 * Past this, response rates fall off a cliff — the guest is being interviewed,
 * not invited. Enforced, not merely suggested.
 */
export const MAX_RSVP_QUESTIONS = 5;

export function rsvpQuestion(id: string): RsvpQuestion | undefined {
  return RSVP_QUESTIONS.find((q) => q.id === id);
}
