# Scene — Build Roadmap

Live build tracker. [`PRODUCT_PLAN.md`](PRODUCT_PLAN.md) is the product/design brief (what and why); [`ARCHITECTURE.md`](ARCHITECTURE.md) is the target data model. **This file is what's actually built and what to do next.** Update it as milestones land.

Last verified: 2026-09-16.

## Where things stand

**Built and working against real Postgres:**

| Area | State |
|---|---|
| Design system | Tokens, fonts, `paper-card`/`shadow-stamp`/`meta-label`, dot texture, stamp animation |
| Landing | Done |
| Discover | Real plans, editorial grid, "your people" strip |
| Plan Details | Trust info, crew, group mix, why-you-might-vibe, address gating |
| Request to Join | Writes a real `Application`, stamp animation |
| Make a Plan | Creates real plans + `CrowdPreference`, cover picker |
| Plans | Going / Requested / Hosting |
| People | Met / suggested, with explained reasons |
| Party Room | People / Today / Memories tabs, gated to confirmed attendees. **No chat** (deliberate) |
| Host desk | Ranked applicant queue, accept / pass / review-later, live crew panel |
| App shell | Sticky header, sidebar, mobile nav, themed 404 |

**Schema:** `User`, `Plan`, `PlanAttendee`, `Application`, `CrowdPreference`, `Photo` (4 migrations).

**Known gaps in what exists:**
- No auth — every request is `user_seed_ananya` via an `x-user-id` header. Anyone can impersonate anyone.
- `trustScore` is a seeded float that nothing ever recomputes.
- Sidebar links to `/profile`, `/settings`, `/notifications` — all 404.
- Ranking is computed per request and never written to `Application.matchScore`.
- No tests, no pagination, not deployed.

---

## Outstanding chore

**Add one test command.** `turbo.json` already declares a `test` task but no package defines a `test` script, so `pnpm test` silently does nothing. Add Vitest to `packages/db` or `apps/api` and write one real test (the address-reveal gate in `apps/api/src/app/api/plans/[id]/route.ts` is the highest-value thing to pin down — it's a privacy guarantee).

---

## ~~Milestone 1 — Close the loop (accept / decline)~~ — DONE

Shipped. `GET /api/plans/[id]/applications` ranks the queue, `PATCH
/api/applications/[id]` records the decision, and accepting creates the
`PlanAttendee` row inside a transaction — which is what unlocks the party room
and the exact address for that guest. `/host` is the three-pane desk.

Ranking is a plain weighted formula in `apps/api/src/lib/matching.ts` (shared
vibes, mutuals already coming, trust, returning-to-this-host). It sets the
order only; the host taps every decision. The UI shows the reasons, never the
score.

Guards covered: non-hosts get 403, unknown statuses 400, a full plan 409.

<details>
<summary>Original plan</summary>

**Why first:** the product cannot currently work end to end. Applications are created and then nothing can ever happen to them. This is also the brief's flagship screen (the "50 DMs" problem) and it needs no new tables.

**Build:**
- `GET /api/plans/[id]/applications` — host only (403 otherwise), returns applicants with trust info + shared vibes.
- `PATCH /api/applications/[id]` — `{ status: "ACCEPTED" | "PASSED" | "REVIEW_LATER" }`. On accept: create the `PlanAttendee` row (role `GUEST`, `firstTime` = has this person attended a plan by this host before) and set `decidedAt`. Must be atomic — use `prisma.$transaction`.
- `apps/web/src/app/(app)/host/page.tsx` — the 3-pane workspace from the brief: applicant list (left) / selected applicant (centre) / your crew + group health (right). Collapses to tabs on mobile.

**Ranking:** start with a plain weighted score computed in the API (shared vibe tags, shared past plans, trust score, hosting history) — no ML. Store it on `Application.matchScore` and put the human reasons in `matchReasons`. Those columns already exist. Never auto-decide: the host taps every Accept.

**Start here:** `apps/api/src/app/api/plans/[id]/applications/route.ts` already has the `POST`. Add a `GET` beside it, then the `PATCH` route, then the screen. Reuse `composeCrew`/`groupHealth` from `apps/api/src/lib/composition.ts` for the right-hand panel.

**Done when:** you can apply as one user, switch the `x-user-id` header to the host, accept, and the applicant appears in the crew with the Party Room unlocked for them.

</details>

---

## Milestone 2 — Real auth

**Why second, not first:** it touches every route, and it's easier once the flows it has to protect actually exist. But nothing is shippable before it — the `x-user-id` header is a total impersonation hole the moment this is public.

**Build:**
- Clerk in `apps/web`: `ClerkProvider`, middleware, sign-in/sign-up routes. (Email required, phone/social optional — decided in `PRODUCT_PLAN.md` §4.)
- Replace `CURRENT_USER_ID` in `apps/web/src/lib/api.ts` — pass the Clerk session token instead of the `x-user-id` header.
- Replace `getCurrentUserId` in `apps/api/src/lib/current-user.ts` — verify the token with `@clerk/backend` and return the real user id. This one function is the entire seam; every route already calls it.
- Clerk webhook → upsert a `User` row on sign-up (`User.id` is already the Clerk id, no mapping table needed).
- **Onboarding** (3 steps from `PRODUCT_PLAN.md` screen 2) — new users have no `vibeTags`, so "why you might vibe" can't work for them. Capture interests, vibe, age/city, optional gender.

**Start here:** the `vercel:auth` skill covers Clerk + Next 16 setup. Do `apps/web` first and keep `apps/api` on the header shim until the frontend works, then swap `getCurrentUserId`.

---

## Milestone 3 — Make trust real

**Why:** "trust comes from repeated real-world interactions" is the product's central claim and it is currently fiction — `trustScore` never changes.

**Build:**
- `Review` + `HangoutAgain` tables (shapes are already in `ARCHITECTURE.md` §4).
- Post-party review flow (rate host/crowd/vibe/safety, "would you attend another plan by this host", "who would you hang out with again"). Negative feedback stays private.
- `trustScore` recompute — a plain function over attendance, hosting, reviews and mutuals, run after a review lands. Weights are still an open decision; pick something simple and write it down.
- Trust/profile pages: `/profile` (yours) and `/people/[id]` (someone else's) — People cards currently link nowhere.
- `Connection` table for mutual "would hang out again" → this is what finally makes "2 mutual connections" real instead of derived from shared plans.

---

## Milestone 4 — Remaining screens

Straightforward once the above exists. Roughly in value order:

- **Notifications** (`/notifications`) — request accepted/declined, new applicant, plan nearly full, someone you know joined.
- **Settings & Safety** (`/settings`) — report/block/leave, plus the privacy visibility controls (per-field: everyone / people in my plans / connections / only me).
- **Photo upload** for Memories — needs blob storage, so it pairs with the deploy milestone. `Photo` table and the gallery already exist; only the upload path is missing.
- **Host History** — the host's previous nights as a standalone page (the Party Room already renders a version of this).

---

## Milestone 5 — Ship it

- Vercel project + link the repo.
- **Hosted Postgres: use Supabase.** Reasoning in the chat log — its realtime rides on your Postgres rows, so when the Party Room eventually gets chat you upgrade from polling with no second data store and no sync layer, and its storage covers photo uploads. Neon is the alternative but you'd then add Ably/Pusher and Blob separately.
- `DATABASE_URL` in `packages/db/.env` and `apps/api/.env.local`, `API_ORIGIN` for the web app's proxy rewrite (`apps/web/next.config.ts`).
- Deploy both apps, point `API_ORIGIN` at the deployed API.

---

## Deferred on purpose

- **Party Room chat** — when it comes, build it on the `Message` table with 5s polling while the tab is visible. Not WebSockets (can't run on Vercel Functions), not LiveKit (bills media participant-minutes for text), not Rocket.Chat (an entire second product to operate). Upgrade to Supabase Realtime only once rooms are genuinely busy.
- **Buzz / City Radar** — Phase 4. Needs the Reddit/X ToS review first, and a `BuzzItem` type kept deliberately separate from `Plan` (see `PRODUCT_PLAN.md` §5).
- **Voice/video** in the room — only if it becomes a real feature; then LiveKit is the right tool.

## Still-open decisions

Don't answer these silently — they're product calls:
- Exact `trustScore` weighting.
- Whether `matchScore` stays a hand-tuned formula or eventually learns from accept/pass history.
- Whether the Party Room ever gets chat, and whether a pre-party video hello is worth the social friction.
