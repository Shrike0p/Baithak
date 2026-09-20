# Party lifecycle, archive and photo visibility — design

**Date:** 2026-09-18
**Status:** implemented

## Problem

Nothing ever set `PlanStatus.COMPLETED` or `CANCELLED` — the enum existed and
only the seed used it. Consequences: parties that had already started still
appeared in Discover as joinable, a host had no way to end or cancel a plan,
and memories were invisible outside the Party Room, so a finished party left no
trace anyone could see.

## How a party ends

Two mechanisms, because either alone fails:

- **Automatic**, on `startsAt`. Discover filters to `startsAt >= now`, and the
  plan page switches to post-party mode. Nothing rots when a host forgets.
- **Host wrap-up**, an explicit "Wrap up the night" that sets `COMPLETED`. This
  is what publishes the party to the archive and the host's history.

Wrap-up is refused before the party has started, so nobody can manufacture a
history of parties that never happened, and refused on a cancelled plan.

**Cancelling** sets `CANCELLED` and keeps the plan visible to everyone who was
accepted — silently vanishing is how someone ends up at a dead address.

**Deleting** is permitted only while no guest is confirmed. After that the plan
is part of other people's history, so the host's exit is cancellation.

## Photo visibility

Default is attendee-only: guests shared these of a private house party, not of
the internet.

`Photo.isPublic` is the **host's opt-in over their own uploads**. A host
advertising their own night can consent on their own behalf; they cannot
consent for a guest, so guest photos are never publishable. Enforced in
`PATCH /api/photos/[id]`, which requires caller = host *and* caller = uploader.

Non-attendees receive published photos and nothing else. They never receive
the URLs of photos they may not see — **a blurred `<img>` still ships the real
file to the browser**, so there was never a blurred-photo teaser.

The gallery originally drew locked placeholder tiles for the hidden count;
that was removed on request. The count still crosses the wire as
`hiddenMemories` and drives the sign-up prompt, but the album shows only what
you're allowed to see.

## Surfaces

- `GET /api/plans/happened` — public, wrapped-up parties, host + counts + the
  published preview only.
- Plan overview grows a Memories section, gated as above.
- Discover grows an "Already happened" strip.
- `/plans` grows a "Your history" group, including cancelled plans.

## Copy

"New around here — say hi" became "New around here — no plans together yet".
There is no inbox, so the original was an instruction with no button behind it.
A `TODO(messaging)` in `apps/api/src/app/api/people/route.ts` marks it for
restoration when messaging ships.

## Not building

Notifying guests when a plan is cancelled — there's no notification system yet,
so they find out by looking. That's the first thing to fix when notifications
land.
