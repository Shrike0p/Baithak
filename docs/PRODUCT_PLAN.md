# Scene — Product Plan

This is the persistent product/design context for **Scene**. Read this before building any product feature — it captures the full brief, the design system, the complete screen inventory, and which phase we're in, so no prior conversation needs to be re-explained.

## 1. Product Summary

**Pitch:** "You don't need a squad to have plans."

Scene helps people discover trusted small-group social plans (house parties, drinks, dinners, game nights, trips) and meet new people in real life — starting with house parties in Bangalore. It solves two matched problems at once:

- **Guests** want to do something this weekend but don't have a group, and don't want to blindly show up at a stranger's house.
- **Hosts** get flooded with DMs from strangers and have no good way to tell who's genuine, who fits the vibe, or how to balance the group — without manually vetting 50 people.

The product is **people + trust + plans + pre-event socialization + reputation**, not event ticketing.

**What it is not:** Luma, Eventbrite, Meetup, a generic event-management SaaS, or a dating app. No ticketing aesthetics, calendar-first nav, "Register for event" language, conference layouts, corporate dashboards, glassmorphism, or generic startup gradients.

**Core loop (the interface should visibly communicate this lifecycle):**

```
Discover a plan → Understand the host → Understand the crew → See why you might vibe
→ Request to join → Host reviews applicants → Host accepts → Party Room opens
→ Guests chat before the event → People become familiar → Meet IRL
→ Photos + memories → Reviews + reputation → Find your next people
```

**Emotional journey the product should produce:** "I don't have a group tonight" → "there are people like me doing things" → "I can see who they are" → "this host seems legit" → "I've already chatted with these people" → "okay, I'll go" → (after) "I actually met people I'd hang out with again."

**Central design principle:** Events are the surface. People + trust are the product.

## 2. Design System Reference

### Palette (exact hex — do not substitute)

| Role | Color | Hex |
|---|---|---|
| Background | Warm Cream | `#F5F0E6` |
| Primary text/borders | Near Black | `#171717` |
| Primary accent (CTAs, important actions) | Burnt Orange | `#F05A28` |
| Secondary accent (playful) | Electric Purple | `#7657E8` |
| Trust / verification / positive | Muted Green | `#4F8A63` |

Rules: cream is the main canvas; near-black for type and borders; orange only for primary CTAs/important actions; purple as playful secondary, used sparingly; green *only* for trust/verification/positive reputation signals. Avoid excessive gradients, avoid neon, avoid using every color in every component.

### Typography — three distinct roles

1. **Display** — **Archivo Black**, uppercase, tight leading (`.86`), for page headings, party names, big numbers, key moments (e.g. "WHAT'S THE PLAN?").
2. **UI** — **DM Sans** for nav, buttons, forms, descriptions, profiles, chat, settings.
3. **Metadata** — **IBM Plex Mono**, uppercase, `.68rem`, bold (the `.meta-label` class) for stat lines: `VERIFIED · 4.8 ★ · HSR`, `12 / 16 PEOPLE`, `SATURDAY · 8:30 PM`.

**Implemented tokens** (`apps/web/src/app/globals.css`) — defined in oklch, resolving to: background `#f5eee1`, foreground `#161616`, paper/card `#fdf8f0`, primary `#f0621d`, secondary `#7e5de0`, accent `#4a884d`. Radius is a deliberately sharp `0.25rem` — not rounded/pill-shaped surfaces. Signature treatment is the **hard offset shadow**: `shadow-stamp-sm` (2px), `shadow-stamp` (4px), `shadow-stamp-lg` (7px), always paired with a `border-2 border-foreground`. Buttons press in on `:active` (`translate-x-0.5 translate-y-0.5`); primary buttons lift on hover (`-translate-y-0.5` + bigger stamp shadow). The `animate-stamp-in` keyframe is the "YOU'RE IN ✓" acceptance stamp.

### Visual language

**Retro social club × modern web app.** Editorial typography, old-school party-flyer layouts, chunky borders, paper texture, sticker-style labels, stamps, disposable-camera photography, Polaroid-style memory cards, slightly imperfect layouts, tactile buttons, handwritten-style accents, subtle film grain. The UX and interaction design underneath should be extremely modern and polished — retro is a *visual* language, not a UX regression. Explicitly **not**: pixel art / arcade aesthetic, glassmorphism, generic SaaS gradients.

### Copy style — human, not corporate

| Use | Not |
|---|---|
| What's the plan? | Discover Events |
| The crew | Attendees |
| Make a plan | Create Event |
| Request to join | Register |
| Why you might vibe | Recommendations |
| Previous nights | Past events |
| You're in ✓ | Registration successful |

### Layout

- Desktop-first, primary target **1440×900**, secondary **1280×800**. Responsive down to tablet/mobile but not mobile-first design.
- Persistent left sidebar as part of the brand (not generic SaaS nav): **Discover / Plans / People / Inbox**, divider, **+ Make a Plan**, then **Profile / Settings** at the bottom. Notification indicators where relevant.
- Main content area is editorial/magazine-like — varied card sizes, not a rigid grid (see Discover in the screen inventory).
- Responsive transformations (not naive shrinking): sidebar → compact nav; multi-column → stacked; host applicant 3-pane workspace → tabs; galleries → horizontal scroll; chat and Party Room stay easily reachable at every width.

### Micro-interactions (subtle, not over-animated)

Buttons compress slightly on click; acceptance triggers a small "YOU'RE IN ✓" stamp animation; stickers have tiny idle movement; Polaroids shift slightly on hover; countdown updates subtly; new connections get a small celebratory animation; photo uploads feel like dropping photos onto a table.

## 3. Screen Inventory

30 screens, grouped by where they sit in the core loop. Screens marked **★** are called out in the original brief as needing the highest polish.

**Before — discovery & trust-building**
1. Landing / Entry — hero "YOU DON'T NEED A SQUAD TO HAVE PLANS," collage of flyers/photos/stickers, CTA "FIND MY PEOPLE →" / "MAKE A PLAN."
2. Onboarding — 3 steps: (1) What are you here for? (multi-select: meet people, weekend plans, house parties, drinks, dinner, music, gaming, sports, trips, new to the city), (2) What's your vibe? (chill/social/loud/adventurous/introvert-friendly/music lover/foodie/night owl/spontaneous), (3) Who do you usually vibe with? (age range, interests, social energy, activities, languages, preferred group size — framed as recommendation input, not dating, not restrictive).
3. **★ Discover** — home feed: Tonight, This Weekend (large cards), Your People Are Going, You Might Vibe, New in Bangalore. Editorial layout, varied card sizes.
4. Plan Card (component, reused throughout Discover) — retro flyer card: title/category/neighborhood/time, capacity (`12/16`), gender/couple breakdown emoji, host name + rating, mutuals/verified/returning counts, CTA "SEE THE CREW →."
5. **★ Plan Details / Trust** — answers "should I actually go?": vibe tags, "Why You Might Vibe" (human reasons, never a bare %).
6. The Crew (inside Plan Details) — group composition breakdown + participant cards (name, age, general location, occupation if volunteered, vibe tags, trust rating, previous attendance, mutuals) — privacy-conscious, no unconsented exposure.
7. Host Profile — Airbnb-style trust page: rating, plans hosted, people hosted, bio, Previous Nights gallery, reviews, trust checklist (phone/social/community history verified).
8. **★ Previous Party Memories** — Polaroid/disposable-camera gallery per past gathering: date, attendee count, photos/videos, rating, short description. Social proof, not a feed.
9. Request to Join — lightweight app: "what's bringing you here," coming solo/with a friend/group, optional note, privacy note ("only information relevant to this plan will be shown to the host"), CTA "SEND REQUEST →."

**Host-side tools**
10. Host: Make a Plan — category (house party/drinks/dinner/game night/movie/sports/trip/other), date/time, neighborhood only (never exact address publicly), capacity (8/12/16/custom), vibe tags.
11. Host: Build Your Crowd — age range, vibe, interests, group-mix targets (visual, e.g. 👩6 👨6 👫2), connection preference (friends of friends / community members / open to new people / invite only). Feels like curating an atmosphere, not filtering candidates.
12. **★ Host: Applicant Dashboard** — "50 people want in. We've organized the crowd for you." Tabs: Best Matches / Good Fit / New People / Review Later. Applicant cards with match reasoning + Pass/Accept. AI ranks; host always decides.
13. **★ Applicant Profile** — full trust view (ratings, plans attended/hosted, mutuals, verification, reviews, attendance history, optional connected socials), Accept/Pass.
14. **★ Group Composition dashboard** — "Your Crew": confirmed count, gender/couple/first-timer/returning breakdown, "group health" narrative ("your group has a good mix..."), CTA "Find More People →." Feels like curating a party, not HR.

**During — party lifecycle**
15. **★ Party Room** — hub once accepted: countdown, tabs (Chat / People / Memories), event area, host, quick actions.
16. **★ Party Room: Chat** ("The Room") — lively group chat + social prompts above/below it (party prompt, quick question, "getting there" logistics) to build familiarity before IRL.
17. Party Room: People ("Get to Know the Crew") — attendee cards with tags (`RETURNING MEMBER` / `FIRST TIME` / `HOST`).
18. Connection Suggestions ("People You Might Vibe With") — explained reasons (shared taste, mutuals, same past plan), CTA "SAY HI 👋" — no romantic/dating framing.
19. Event Day Mode ("Today's the Day") — time/neighborhood/confirmed count, quick actions (Open Chat / See the Crew / Share ETA / Contact Host / Safety-Help). Exact address revealed only here, to approved attendees.

**After — memories & reputation**
20. Post-Party Memories — Polaroid/disposable-camera album with rotated photos, film borders, timestamps, handwritten captions — a private shared album, not an Instagram feed.
21. **★ Host History** ("Prakhar's Nights") — past parties as visual memory cards (attendee count, photo count, rating) — the platform's Airbnb-style proof.
22. Post-Party Review — rate host/crowd/vibe/safety/overall; "would you attend another plan by this host?" (yes/maybe/no); "who would you hang out with again?" (❤️ per participant) — builds the social graph; negative feedback stays private.
23. Trust Profile — reputation page: experience (attended/hosted counts), community (X people have attended plans with them), verification checklist, reviews. Reads as reputation, not a credit score.

**Platform-wide**
24. **★ People** — "Find Your People": You Might Vibe / From Your Previous Plans / People You've Met IRL / Your Connections — each profile explains who they are, what they like, why you might vibe, why they're trustworthy.
25. Inbox — unified: party rooms, DMs, invitations, host messages.
26. Profile (personal) — photo, name, age, city, vibe, interests, trust score, plans attended/hosted, people met, memories, connected socials, privacy/safety settings entry points.
27. Safety Center — report user, block user, leave event, contact host, privacy controls, location controls, emergency/help info. Calm, not scary.
28. Privacy Settings — visibility control per data type (profile, social links, photos, previous plans, location, interests, personal details) with levels: Everyone / People in my plans / Approved connections / Only me.
29. Empty States — "NOTHING YET" (no plans), "YOU HAVEN'T MET YOUR PEOPLE YET" (no connections), "NO ONE'S KNOCKING... YET" (no applications) — each with a warm nudge + CTA.
30. Notifications — contextual/social: request accepted/declined, new applicant, party nearly full, new chat message, new person joining, past-party person joining again, new photos, new review, new plan recommendation, mutual connection attending.

## 4. Core Product Concepts (cross-cutting)

- **"Why You Might Vibe"** appears everywhere a match is shown. Never a bare percentage ("94% match") — always human reasons: shared music taste, mutual connections, similar plans attended, similar nightlife preference, etc.
- **Trust through history, not a single badge.** Trust accumulates from successful attendance, successful hosting, community reviews, mutual connections, returning members, shared past experiences, and optional verification — communicated as "trust comes from repeated real-world interactions," not "Verified ✓" alone.
- **Party Room lifecycle staging.** Before (discover → apply → accept → chat) / During (attend → interact → capture memories) / After (photos → reviews → connections → reputation) — the UI should visibly evolve through these stages, not present one static view.
- **Safety/location principle.** Public plan listings show neighborhood only (e.g. "HSR Layout"), never an exact address; exact location unlocks only after acceptance, at the appropriate stage (Event Day Mode).
- **Privacy principle.** No LinkedIn requirement. Progressive trust signals only: phone, email, optional social account, community history, successful attendance, host/guest reputation, mutual connections — visibility of all of it is user-controlled (see Privacy Settings).
- **Verification cost tradeoff (decided).** Email verification is required at signup (free via Clerk's built-in email OTP). Phone (SMS OTP costs per send) and social account linking stay optional, user-added trust badges — never a gate. This keeps cost near-zero while trust still accrues mainly from community history (attendance/hosting/reviews), not verification badges.

## 5. The Buzz / City Radar (Reddit + Twitter signal) — Decision

Resolved during planning discussion:

- **Do not merge scraped content into Discover's plan feed.** Discover's plan cards carry the platform's core trust promise (real host, real crew, real trust score). Scraped Reddit/X chatter is unverified demand-signal, not a joinable plan — mixing the two in one card grid would blur exactly the distinction the product depends on.
- **Ship it as a separate, visually distinct section** adjacent to Discover — working name **"The Buzz"** / **"City Radar"**. Different visual treatment entirely (ticker/noticeboard feel, not a flyer card): no trust score, no capacity counter, no "Request to Join" button. Each item shows a source tag (Reddit/X) and an audience-specific CTA:
  - To a host: **"Someone should host this →"** (pre-fills Make a Plan).
  - To a guest: **"Want this to happen?"** (lightweight demand vote, not a real signup).
- **Data model implication (note now, build later):** when this ships, model it as a distinct `BuzzItem` type in `packages/types` — separate from `Plan` — with no `capacity`/`hostId`/trust fields, so the two concepts never get conflated in the schema.
- **Status: deferred**, not part of the initial core-loop build (Phase 1-3 below). Revisit in Phase 4.
- **Pre-build follow-up:** legal/ToS review needed before implementation — Reddit API terms, X/Twitter scraping ToS, attribution requirements. This is a Phase 0 research item, not a current blocker.

## 6. Phased Build Plan

Each phase lists goal, in-scope screens/components, and explicit out-of-scope items to prevent scope creep into later phases. No coding has started yet — this document is the handoff for whenever a future session begins Phase 1.

### Phase 0 — Research & Validation
- Competitive scan: Airbnb's trust/reputation model, Partiful, Bumble BFF/Fizz, existing Bangalore party WhatsApp/Instagram communities.
- Legal: liability for facilitating in-person gatherings in private homes (host disclaimers, ToS), Reddit/X scraping ToS and attribution rules.
- Design the trust-score algorithm: inputs (attendance, hosting, reviews, mutuals, verification), not just UI for it.
- Recruit a handful of real Bangalore hosts to seed supply before/alongside build.
- **Out of scope:** any code.

### Phase 1 — Core Loop MVP
- **In scope:** Discover, Plan Details/Trust, Request to Join, Make a Plan, Party Room (chat tab only), basic Profile. Mock/seed data only — no real auth or database in this phase (per current decision; revisit when coding starts).
- **Out of scope:** Applicant Dashboard, Group Composition, Buzz, Notifications, Safety Center.

### Phase 2 — Host Power Tools
- **In scope:** Build Your Crowd, Applicant Dashboard (Best Matches/Good Fit/New People/Review Later), Applicant Profile, Group Composition dashboard — the flagship "50-DM problem" screens, prioritized for polish.
- **Out of scope:** Buzz, deep Trust Profile/reviews (Phase 3), Connection Suggestions (Phase 4).

### Phase 3 — Trust & Social Proof Depth
- **In scope:** Host History, Previous Party Memories, Trust Profile, post-party Reviews, "Why You Might Vibe" surfaced consistently across Discover/Plan Details/Applicant screens, verification flows (phone/social/community history).
- **Out of scope:** Buzz, Notifications system, onboarding vibe-matching refinement.

### Phase 4 — Growth Layer
- **In scope:** The Buzz/City Radar (per Section 5, now unblocked), Connection Suggestions, People section, Notifications, Onboarding (vibe/interest capture — most valuable once there's enough plan volume to recommend against).
- **Out of scope:** second-city expansion.

### Phase 5 — Safety, Privacy & Polish
- **In scope:** Safety Center, Privacy Settings, Empty States, micro-interactions. Should run *in parallel* with Phase 2-3 given the trust-first positioning, not bolted on at the end.

### Phase 6 — Scale
- Second-city expansion; refine trust-score algorithm using real usage data.

## 7. Open Decisions — Not Yet Resolved

Do not silently decide these when building — ask first:
- Exact trust-score formula and weighting (attendance vs. hosting vs. reviews vs. mutuals vs. verification).
- Whether Buzz needs a scraping worker in `apps/api` or can launch with manually-seeded mock items first.
- Auth provider choice (e.g. Clerk vs. custom) — deferred, not chosen yet.
- Database choice (e.g. Neon Postgres via Vercel Marketplace) — deferred, not chosen yet.
- Whether Phase 1 UI work happens directly as coded Next.js components in `apps/web`, or gets a static high-fidelity design pass first — leaning coded-with-mock-data per current direction, but confirm at the start of Phase 1.
