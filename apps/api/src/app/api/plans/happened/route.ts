import { NextResponse } from "next/server";
import { prisma } from "@baithak/db";

/**
 * Parties that are over and that the host chose to wrap up — the platform's
 * social proof. Public on purpose: this is what tells a stranger the thing is
 * real before they'll sign up.
 *
 * Only ever exposes what the host published. Guest photos and everyone's
 * names stay behind the room gate; a visitor gets the host, the counts, and a
 * cover image.
 */
export async function GET() {
  const plans = await prisma.plan.findMany({
    where: { status: "COMPLETED" },
    orderBy: { startsAt: "desc" },
    take: 24,
    include: {
      host: { select: { id: true, name: true, image: true, trustScore: true } },
      photos: { where: { isPublic: true }, orderBy: { takenAt: "asc" }, take: 2 },
      _count: { select: { attendees: true, photos: true } },
    },
  });

  return NextResponse.json(
    plans.map((plan) => ({
      id: plan.id,
      title: plan.title,
      category: plan.category,
      vibeTags: plan.vibeTags,
      neighborhood: plan.neighborhood,
      startsAt: plan.startsAt,
      imageUrl: plan.imageUrl,
      host: plan.host,
      people: plan._count.attendees,
      photoCount: plan._count.photos,
      // The teaser, and only the teaser.
      preview: plan.photos.map((p) => ({ id: p.id, url: p.url, caption: p.caption })),
      lockedCount: Math.max(0, plan._count.photos - plan.photos.length),
    })),
  );
}
