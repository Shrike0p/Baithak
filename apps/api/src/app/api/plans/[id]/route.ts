import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@baithak/db";
import { getCurrentUserId } from "@/lib/current-user";
import { deleteObject, keyFromUrl, publicUrl } from "@/lib/storage";
import { composeCrew, groupHealth } from "@/lib/composition";
import { notify, attendeesOf } from "@/lib/notify";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/plans/[id]">) {
  const { id } = await ctx.params;
  // Public: a signed-out visitor still gets the plan, just not the people in it.
  const userId = await getCurrentUserId(request);


  const plan = await prisma.plan.findUnique({
    where: { id },
    include: {
      host: { select: { id: true, name: true, image: true, bio: true, trustScore: true } },
      crowd: true,
      photos: {
        orderBy: { takenAt: "asc" },
        include: { uploader: { select: { name: true } } },
      },
      attendees: {
        where: { status: "CONFIRMED" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              age: true,
              city: true,
              occupation: true,
              gender: true,
              vibeTags: true,
              trustScore: true,
            },
          },
        },
      },
    },
  });

  if (!plan) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Where the viewer's own request stands, so the page shows "sent" or "not
  // this time" instead of offering a join button that can't do anything.
  const myRequest =
    userId && plan.hostId !== userId
      ? (
          await prisma.application.findUnique({
            where: { planId_applicantId: { planId: plan.id, applicantId: userId } },
            select: { status: true },
          })
        )?.status ?? null
      : null;
  const viewerIsConfirmedAttendee = plan.attendees.some((a) => a.userId === userId);
  const isHost = plan.hostId === userId;
  const hasStarted = plan.startsAt.getTime() <= Date.now();

  // Who sees which photos.
  //
  // People who were there see the album. Everyone else sees only what the host
  // chose to publish, and a count of the rest — never their URLs, because a
  // blurred image in the browser is still the real file one devtools panel
  // away. The count is the teaser; the photos stay behind the gate.
  const visible = viewerIsConfirmedAttendee ? plan.photos : plan.photos.filter((p) => p.isPublic);
  const memories = {
    memories: visible.map((p) => ({
      id: p.id,
      url: p.url,
      caption: p.caption,
      takenAt: p.takenAt,
      uploader: p.uploader.name,
      isPublic: p.isPublic,
      canPublish: isHost && p.uploaderId === userId,
    })),
    hiddenMemories: plan.photos.length - visible.length,
  };
  const composition = composeCrew(plan.attendees);

  return NextResponse.json({
    id: plan.id,
    title: plan.title,
    category: plan.category,
    vibeTags: plan.vibeTags,
    neighborhood: plan.neighborhood,
    imageUrl: plan.imageUrl,
    chipIn: plan.chipIn,
    chipInNote: plan.chipInNote,
    // So the join form asks up front. The UPI ID is NOT here — it lives in the
    // party room, behind the same gate as the exact address.
    askPhone: plan.askPhone,
    // exact address only ever leaves the API for confirmed attendees — see docs/ARCHITECTURE.md flow 2.4
    exactAddress: viewerIsConfirmedAttendee ? plan.exactAddress : null,
    startsAt: plan.startsAt,
    capacity: plan.capacity,
    host: plan.host,
    isHost,
    composition,
    groupHealth: groupHealth(composition, plan.capacity, plan.crowd, isHost),
    // The host's preferred mix / age range is their own planning data.
    crowd: isHost ? plan.crowd : null,
    // Guests never agreed to be shown to the anonymous internet — hosts are
    // advertising, attendees aren't. Signed out, you get counts, not names.
    crew: !userId
      ? []
      : plan.attendees.map((a) => ({
          role: a.role,
          firstTime: a.firstTime,
          user: {
            ...a.user,
            // Individual gender is never exposed — only the aggregate above.
            gender: undefined,
          },
        })),
    viewerSignedIn: Boolean(userId),
    // What the join form asks. Sent up front so the applicant sees the whole
    // ask at once instead of hitting a 422 after they've filled it in.
    rsvpQuestions: plan.rsvpQuestions,
    houseRules: plan.houseRules,
    requiredOfGuests: plan.requiredOfGuests,
    status: plan.status,
    hasStarted,
    isAttending: viewerIsConfirmedAttendee,
    myRequest,
    // Accepted guests only — the same gate as the exact address — so they can
    // pay from the plan page, not just from inside the party room.
    ...(viewerIsConfirmedAttendee && !isHost && plan.chipIn ? await guestPayment(plan.id, userId!, plan.upiId) : {}),
    ...memories,
  });
}

/**
 * Host-only edits: the cover image, and the two lifecycle moves a host can
 * make. Still deliberately narrow — changing a plan's time, capacity or
 * address after people have been accepted has consequences for them and needs
 * its own design.
 */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/plans/[id]">) {
  const { id } = await ctx.params;
  const userId = await getCurrentUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const plan = await prisma.plan.findUnique({
    where: { id },
    select: { hostId: true, imageUrl: true, status: true, startsAt: true, title: true },
  });
  if (!plan) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (plan.hostId !== userId) {
    return NextResponse.json({ error: "only the host can edit this plan" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));

  // "Wrap up the night" — publishes the party to the host's history and opens
  // the archive entry. Only after it has actually started, so a host can't
  // manufacture a history of parties that never happened.
  if (body.status === "COMPLETED") {
    if (plan.status === "CANCELLED") {
      return NextResponse.json({ error: "this plan was cancelled" }, { status: 409 });
    }
    if (plan.startsAt.getTime() > Date.now()) {
      return NextResponse.json({ error: "this party hasn't started yet" }, { status: 409 });
    }
    const updated = await prisma.plan.update({
      where: { id },
      data: { status: "COMPLETED" },
      select: { id: true, status: true },
    });

    notify(
      (await attendeesOf(id, userId)).map((guest) => ({
        userId: guest,
        kind: "PLAN_WRAPPED" as const,
        title: `${plan.title} is a wrap`,
        body: "Add your photos to the album while you still remember the night.",
        href: `/plans/${id}/room?tab=memories`,
        planId: id,
        actorId: userId,
      })),
    );

    return NextResponse.json(updated);
  }

  // Cancelling keeps the plan visible to everyone who was accepted — people
  // need to find out rather than have it silently vanish from their plans.
  if (body.status === "CANCELLED") {
    if (plan.status === "COMPLETED") {
      return NextResponse.json({ error: "this party already happened" }, { status: 409 });
    }
    // Told before the write is announced anywhere else: a cancelled party that
    // nobody hears about is how someone ends up outside a dark house.
    notify(
      (await attendeesOf(id, userId)).map((guest) => ({
        userId: guest,
        kind: "PLAN_CANCELLED" as const,
        title: `${plan.title} is off`,
        body: "The host cancelled. Don't turn up.",
        href: `/plans/${id}`,
        planId: id,
        actorId: userId,
      })),
    );

    const updated = await prisma.plan.update({
      where: { id },
      data: { status: "CANCELLED" },
      select: { id: true, status: true },
    });
    return NextResponse.json(updated);
  }

  const objectKey = body.objectKey;
  if (typeof objectKey !== "string" || !objectKey.startsWith(`covers/${id}/`)) {
    return NextResponse.json({ error: "bad object key" }, { status: 400 });
  }

  // One cover per plan — the previous upload goes, so a host swapping covers
  // doesn't leave a trail of dead images in storage. Presets aren't ours to
  // delete, so keyFromUrl returning null is the signal to leave it alone.
  const previous = plan.imageUrl && keyFromUrl(plan.imageUrl);
  if (previous) await deleteObject(previous);

  const updated = await prisma.plan.update({
    where: { id },
    data: { imageUrl: publicUrl(objectKey) },
    select: { id: true, imageUrl: true },
  });

  return NextResponse.json(updated);
}

/**
 * Hard delete, and only while nobody else is committed. Once a guest has been
 * accepted the plan is part of their history too, so the host's exit is
 * CANCELLED — which they can still see — rather than erasure.
 */
export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/plans/[id]">) {
  const { id } = await ctx.params;
  const userId = await getCurrentUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const plan = await prisma.plan.findUnique({
    where: { id },
    select: {
      hostId: true,
      imageUrl: true,
      _count: { select: { attendees: { where: { status: "CONFIRMED", role: "GUEST" } } } },
    },
  });
  if (!plan) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (plan.hostId !== userId) {
    return NextResponse.json({ error: "not your plan" }, { status: 403 });
  }
  if (plan._count.attendees > 0) {
    return NextResponse.json(
      { error: "people have been accepted — cancel it instead" },
      { status: 409 },
    );
  }

  const cover = plan.imageUrl && keyFromUrl(plan.imageUrl);
  if (cover) await deleteObject(cover);

  // Applications, attendees and photos cascade from the Plan relation.
  await prisma.plan.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

/** The UPI ID to pay and where this guest's chip-in stands. */
async function guestPayment(planId: string, userId: string, upiId: string | null) {
  const myPayment = await prisma.application.findUnique({
    where: { planId_applicantId: { planId, applicantId: userId } },
    select: { paidClaimedAt: true, paidConfirmedAt: true },
  });
  return { upiId, myPayment };
}
