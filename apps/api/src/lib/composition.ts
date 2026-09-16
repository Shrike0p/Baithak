import type { Gender, CrowdPreference } from "@scene/db";

type Member = { firstTime: boolean; user: { gender: Gender | null } };

export interface Composition {
  women: number;
  men: number;
  nonBinary: number;
  undisclosed: number;
  firstTimers: number;
  returning: number;
  total: number;
}

export function composeCrew(members: Member[]): Composition {
  const count = (g: Gender) => members.filter((m) => m.user.gender === g).length;

  return {
    women: count("WOMAN"),
    men: count("MAN"),
    nonBinary: count("NON_BINARY"),
    // PREFER_NOT_TO_SAY and null are the same thing to everyone reading this.
    undisclosed: members.filter(
      (m) => m.user.gender === null || m.user.gender === "PREFER_NOT_TO_SAY"
    ).length,
    firstTimers: members.filter((m) => m.firstTime).length,
    returning: members.filter((m) => !m.firstTime).length,
    total: members.length,
  };
}

/**
 * Nudges only. These never block a request or auto-reject an applicant — the
 * host reads them and still decides every accept by hand.
 *
 * `forHost` gates the target-shortfall lines: the host's preferred mix and age
 * range are their own planning data, so a guest never sees them.
 */
export function groupHealth(
  c: Composition,
  capacity: number,
  crowd: CrowdPreference | null,
  forHost: boolean
): string[] {
  const notes: string[] = [];

  if (c.returning > 0 && c.firstTimers > 0) {
    notes.push(
      `A comfortable mix of ${c.returning} returning and ${c.firstTimers} new ${
        c.firstTimers === 1 ? "face" : "faces"
      }.`
    );
  } else if (c.firstTimers === c.total && c.total > 0) {
    notes.push("Everyone here is new to each other — that's half the fun.");
  }

  if (forHost && crowd?.targetWomen && c.women < crowd.targetWomen) {
    notes.push(
      `You're ${crowd.targetWomen - c.women} short of your preferred ${crowd.targetWomen} women.`
    );
  }
  if (forHost && crowd?.targetMen && c.men < crowd.targetMen) {
    notes.push(
      `You're ${crowd.targetMen - c.men} short of your preferred ${crowd.targetMen} men.`
    );
  }

  const spotsLeft = capacity - c.total;
  if (spotsLeft <= 0) notes.push(forHost ? "You're full. Nice." : "This one's full.");
  else if (spotsLeft <= 3) notes.push(`Only ${spotsLeft} spots left.`);

  return notes;
}
