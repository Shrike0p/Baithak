import { prisma } from "@baithak/db";

/**
 * Everyone this person shouldn't be shown, in either direction.
 *
 * Both directions on purpose: if A blocks B, A stops seeing B *and* B stops
 * seeing A. One-directional blocking lets the blocked person keep watching,
 * which is the thing people block to stop.
 */
export async function hiddenUserIds(userId: string | null): Promise<string[]> {
  if (!userId) return [];

  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });

  return [
    ...new Set(blocks.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId))),
  ];
}
