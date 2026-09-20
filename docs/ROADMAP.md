# Baithak — Build Roadmap

Live build tracker. [`PRODUCT_PLAN.md`](PRODUCT_PLAN.md) is the product/design brief (what and why); [`ARCHITECTURE.md`](ARCHITECTURE.md) is the target data model. **This file is what's actually built and what to do next.** Update it as milestones land.

Last verified: 2026-09-18.

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
| Party Room | Chat / People / Today / Memories / Review tabs, gated to confirmed attendees |
| Chat | Group chat per plan, 5s polling while the tab is visible. No DMs — you earn a conversation by being accepted |
| Host desk | Ranked applicant queue, accept / pass / review-later, live crew panel |
| Auth | Better Auth, email + password, DB sessions, middleware, onboarding |
| App shell | Sticky header, sidebar, mobile nav, themed 404 |
| Notifications | Accepted / declined / new applicant / cancelled / wrapped, real unread badge, mark-all-read |
| Settings & safety | Block (two-way, silent), report a person or plan, leave a plan, honest visibility summary |
| Profile trust | Host-view warning instead of a bare %, one allowlisted social link surfaced to hosts |
| Party lifecycle | Host wrap-up / cancel / delete, auto-past, public "already happened" archive, attendee-gated memories with host opt-in publishing |
| Trust | Real `trustScore` — a written-down formula over attendance, hosting, ratings and mutual connections, recomputed when a review lands. Explained on profiles, never a bare number |
| Reviews | Post-party ratings (host / crowd / vibe / safety), "would you go again", private note, and a mutual "hang out again" that forms `Connection` rows |
| Profiles | `/people/[id]` — stats, vibe, social, host history, block and report |
| Sharing | Native share sheet / copy link, plus a generated ticket-style link preview per plan (`opengraph-image.tsx`) |
| Photo upload | Memories album (drop zone, multi-select, delete), profile avatars, plan covers — browser → Supabase Storage via signed URLs |

**Schema:** `User`, `Session`, `Account`, `Verification`, `Plan`, `PlanAttendee`, `Application`, `CrowdPreference`, `Photo`, `Block`, `Report`, `Notification` (11 migrations).

**Known gaps in what exists:**
- Reports are recorded but there is no moderation queue — nothing reviews them yet.
- Per-field privacy controls (ARCHITECTURE.md §4) are not built; Settings states the fixed rules instead, because a toggle nothing enforces is a false promise.
- Search was removed from the header until there's enough content for it to return anything.
- **RELEASE BLOCKER — email verification is off.** `requireEmailVerification:
  false` in `packages/auth`, because no email provider is wired up. On its own
  that's untidy; combined with account linking it's exploitable.

  To make Google sign-in work for someone who already has a password account,
  `accountLinking.requireLocalEmailVerified` is set to `false`. That means an
  attacker who registers *your* email with a password of their choosing gets
  silently linked to your Google identity the first time you use it — and their
  password then opens your account.

  Fine while there are no real users. **Before launch:** wire an email
  provider, set `requireEmailVerification: true`, and delete the
  `requireLocalEmailVerified` override so it returns to its strict default.
- No password reset, and no optional phone/social verification.
- **Google sign-in is wired but not switched on** — `packages/auth` registers
  the provider only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are
  present, and the button renders only then. Needs an OAuth client from the
  Google Cloud Console with `<origin>/auth/callback/google` as a redirect URI.
- ~~Signing up without onboarding silently dead-ends.~~ Fixed: the app layout
  redirects anyone without `onboardedAt` to `/onboarding`, keeping the path in
  `?next=`. The old client-side push after sign-up was trivial to walk around,
  and a social sign-in skipped it entirely — Google gives a name and a photo,
  not the age, city and vibe tags a host actually judges.
- **Deleting a user fails.** `Session` and `Account` cascade, but `Application`,
  `PlanAttendee` and `Plan` have no `onDelete`, so Postgres blocks the delete.
  Needs a deliberate decision per table: applications can go, but attendance
  history feeds other people's trust and probably wants anonymising, not deleting.
- No session cleanup job (expired `Session` rows are never pruned) and no rate
  limiting on sign-in.
- Ranking is computed per request and never written to `Application.matchScore`.
- Guest trust uses the `crowdRating` of nights they attended — the closest
  honest signal, since nobody rates guests individually. Revisit if it proves
  too blunt.
- No pagination anywhere; every list returns everything.
- Not deployed.
- Tests: 35 in `apps/api` (authorization matrix) and 6 in `@baithak/types`
  (the trust formula). All mock- or pure-function-based. No tests on the web
  app, and none that touch a real database — which is how a missing
  `onDelete: Cascade` got past them once.

---

## ~~Outstanding chore — test command~~ — DONE

Vitest runs in `apps/api` (`pnpm --filter api test`). 35 tests, all on the
authorization matrix: who may upload what, who may delete or publish a photo,
and the plan lifecycle guards. Deliberately mock-based, so they pin down the
rules without needing a database — which is also their limit, and how a missing
`onDelete: Cascade` got past them once.

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

## ~~Milestone 2 — Real auth~~ — DONE

Built on **Better Auth**, self-hosted, rather than Clerk — Clerk bills per monthly
active user, which is the wrong shape for a consumer social app. This runs on the
Postgres we already have and costs nothing per user.

Sessions live in the database rather than a stateless JWT. That is what makes the
two-app split work: `apps/api` resolves the session against the same database it
already connects to, with no shared signing secret to drift and no token
forwarding. Revoking a session also takes effect immediately.

- `packages/auth` holds the single shared instance — both apps construct auth the
  same way, so their config cannot disagree
- Mounted at `/auth`, not `/api/auth`, because `apps/web` rewrites all of `/api/*`
  to `apps/api` and would otherwise swallow it
- `getCurrentUserId` now returns `string | null` and every route 401s on null
- Server-side renders forward the incoming cookie by hand (`authHeaders` in
  `apps/web/src/lib/api.ts`); in the browser the cookie rides along automatically
- Middleware does an optimistic cookie check only — real enforcement is in the API
- Onboarding captures vibe tags, age, city, occupation and optional gender

Verified: the old `x-user-id` header is inert, forged cookies 401, two different
sessions get their own data, non-hosts still 403, and `trustScore`/`id` cannot be
set by the client.

Seeded users have real credential accounts — sign in as `ananya@seed.local` (or any
seeded name) with `baithak1234`.

---

## Milestone 2.5 — Progressive onboarding and public browsing — PARTLY DONE

**Done:** `/plans/<id>` and its OG image now read without an account, which is
what makes a shared link preview instead of bouncing every crawler to sign-in.
The page already withholds the crew, the composition and the exact address from
signed-out viewers, and `POST /api/plans/[id]/applications` rejects an
incomplete profile with a usable reason.

**Still to do:** `/discover` is still gated, so a stranger can see one plan they
were sent but cannot browse. That is the remaining half of the funnel.

### Original scope

**Why now:** demonstrated failure, not a preference. An account with no profile can
apply today, and arrives in the host's queue with score 0 and every field blank —
so the host passes, and the guest never learns why.

**The rule:** hosts are public, guests are private (the Airbnb split). A host is
advertising to strangers; an accepted guest never agreed to be shown to the
anonymous internet.

| Public, no account | Gated |
|---|---|
| Landing with real plans, Discover feed | The Crew — named attendees |
| Title, neighbourhood, time, vibe tags, `12 / 16` | Group composition |
| Host first name, rating, previous nights | Why you might vibe |
| Aggregate signals (`8 verified · 5 returning`) | Party Room, exact address |

Everything gated is something that needs to know who you are anyway, so the privacy
line and the growth line land in the same place.

**Build:**
- Middleware: stop gating `/discover` and `/plans/[id]`; keep `/host`, `/profile`,
  `/plans/[id]/room`, `/onboarding` behind sign-in
- API: public read shapes that omit the crew, composition and vibe reasons
- `POST /api/plans/[id]/applications` rejects an incomplete profile with a usable
  reason instead of creating a doomed application
- Request to Join asks for the missing bits inline — *"hosts need to know who
  they're letting in"* — which is a justified ask at the moment of intent, unlike a
  wall on `/discover`
- Landing page shows real plans (its polaroid captions are currently hardcoded)

**Minimum to apply:** age, city, two or three vibe tags. Gender stays optional.
Bio and photo stay nudges, framed by outcome (*"hosts accept 3× more people with a
photo"*) rather than a completeness ring — this is not a dating app.

---

## ~~Milestone 3 — Make trust real~~ — MOSTLY DONE

`Review`, `HangoutAgain` and `Connection` exist. `trustScore` is computed by
`packages/types/src/trust.ts` — a plain readable formula, not a model, because
a host deciding who enters their home deserves to know what the number means.
Showing up is the floor (attendance and hosting, with diminishing returns);
ratings are the only thing that can pull someone down, and confidence grows
with volume so two reviews don't swing as hard as ten.

The review form lives in the Party Room's Review tab — the only place anyone
will actually fill it in. "Who would you hang out with again" stays private
unless it's mutual, so nobody learns they weren't picked.

Seeded trust scores are gone: `db:seed` now computes them, because a seeded 4.8
was exactly the fiction this replaced.

**Still to do:** nothing surfaces the review prompt outside the room — a
notification or a nudge after wrap-up is what will actually get them filled in.

### Original plan

**Why:** "trust comes from repeated real-world interactions" is the product's central claim and it is currently fiction — `trustScore` never changes.

**Build:**
- `Review` + `HangoutAgain` tables (shapes are already in `ARCHITECTURE.md` §4).
- Post-party review flow (rate host/crowd/vibe/safety, "would you attend another plan by this host", "who would you hang out with again"). Negative feedback stays private.
- `trustScore` recompute — a plain function over attendance, hosting, reviews and mutuals, run after a review lands. Weights are still an open decision; pick something simple and write it down.
- Trust/profile pages: `/profile` (yours) and `/people/[id]` (someone else's) — People cards currently link nowhere.
- `Connection` table for mutual "would hang out again" → this is what finally makes "2 mutual connections" real instead of derived from shared plans.

---

## Milestone 4 — Remaining screens

- ~~**Notifications**~~ — DONE. Written at the moment things happen rather than
  derived on read, because a derived feed cannot record a cancellation. The bell
  opens a dropdown; `/notifications` is the full list.
- ~~**Settings & Safety**~~ — mostly done. Block (two-way and silent), report a
  person or plan, leave a plan, and an honest statement of the fixed visibility
  rules. **Still missing:** per-field privacy controls, and any moderation queue
  behind the reports.
- **Host History** — the host's previous nights as a standalone page. The Party
  Room and the public archive each render a version of this already.
- **Share the archive too.** Only `/plans/[id]` has a link preview. A wrapped-up
  night and a host's history are the other two things worth sending someone.

---

## Milestone 5 — Ship it

- Vercel project + link the repo.
- **Blob storage: Supabase Storage, already wired up.** Chosen over Cloudflare
  R2 because the free plan needs no card on file and so cannot produce a
  surprise bill — no provider offers a real hard spending cap, only alerts.
  Accepted limits: 1 GB, 5 GB egress/month, free projects pause after a week
  idle. R2 is the upgrade path if egress bites; all storage access sits behind
  `apps/api/src/lib/storage.ts`. Design:
  `docs/superpowers/specs/2026-09-17-photo-upload-design.md`.
- **Hosted Postgres: use Supabase.** Reasoning in the chat log — its realtime rides on your Postgres rows, so when the Party Room eventually gets chat you upgrade from polling with no second data store and no sync layer, and its storage covers photo uploads. Neon is the alternative but you'd then add Ably/Pusher and Blob separately.
- **Domain: baithak.buzz** (bought). Web on `baithak.buzz`, API on
  `api.baithak.buzz`, both Vercel projects from this repo.
- **Step-by-step runbook: [`DEPLOY.md`](DEPLOY.md).**
- **Connection pooling is mandatory, not optional.** Serverless functions each
  open a Prisma connection and exhaust Postgres. `DATABASE_URL` goes through
  Supabase's transaction pooler (6543, `?pgbouncer=true&connection_limit=1`)
  and `DIRECT_URL` (5432) exists because migrations can't run through it.
  Already wired into the Prisma datasource.
- **Cost: £0/month to start.** Vercel Hobby covers both apps and Supabase free
  covers the database and storage. Two things to know: Hobby is
  **non-commercial only**, so charging for anything means Pro ($20/mo); and
  Supabase free has **no backups** and pauses after a week idle ($25/mo fixes
  both).
- Both apps on Vercel means each API call costs two invocations (the web
  rewrite, then the API). That's ~700 user-hours of open chat per month against
  the 1M free invocations — irrelevant now, worth remembering later. Moving the
  API to an always-on host (~$5/mo) or pointing the browser at
  `api.baithak.buzz` directly both remove it.

---

## Deferred on purpose

- ~~**Party Room chat**~~ — BUILT, exactly as planned: `Message` table, 5s
  polling while the tab is visible, incremental via `?since=`.

  LiveKit was reconsidered and rejected again on current pricing: it bills
  **per WebRTC connection-minute** ($0.0005/min, 5,000 free), so an idle chat
  tab costs money for being open. That's a media price for moving a sentence.
  Supabase Realtime is the upgrade path — free plan covers 200 concurrent
  connections and 2M messages/month, and it subscribes to these same rows, so
  the swap is one hook with no schema or API change.

  **No DMs, on purpose.** Open messaging between strangers is the primary
  harassment vector in social products; here you earn a conversation by being
  accepted into a plan. If DMs ever happen, gate them behind a mutual
  `Connection` so both people opted in.
- **Buzz / City Radar** — Phase 4. Needs the Reddit/X ToS review first, and a `BuzzItem` type kept deliberately separate from `Plan` (see `PRODUCT_PLAN.md` §5).
- **Voice/video** in the room — only if it becomes a real feature; then LiveKit is the right tool.

## Still-open decisions

Don't answer these silently — they're product calls:
- Exact `trustScore` weighting.
- Whether `matchScore` stays a hand-tuned formula or eventually learns from accept/pass history.
- Whether the Party Room ever gets chat, and whether a pre-party video hello is worth the social friction.
