import { prisma, type NotificationKind } from "@baithak/db";

/**
 * Writing a notification.
 *
 * Every call is fire-and-forget: a notification failing must never fail the
 * thing it's about. Being accepted into a party is the real event; telling you
 * about it is a courtesy that can be retried, and losing one is better than
 * rolling back the acceptance.
 */
interface Notice {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  href?: string;
  planId?: string;
  actorId?: string;
}

export function notify(notice: Notice | Notice[]): void {
  const all = Array.isArray(notice) ? notice : [notice];
  if (all.length === 0) return;

  void prisma.notification
    .createMany({ data: all })
    .catch((err) => console.error("notification write failed", err));
}

/** Everyone confirmed on a plan, minus whoever caused the event. */
export async function attendeesOf(planId: string, except?: string): Promise<string[]> {
  const rows = await prisma.planAttendee.findMany({
    where: { planId, status: "CONFIRMED", ...(except ? { userId: { not: except } } : {}) },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}
