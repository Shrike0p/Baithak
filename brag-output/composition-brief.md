# Hyperframes Composition Brief: Baithak

## Objective
Create a short launch-style brag video for Baithak — a video that shows a stranger becoming a guest in 22 seconds, using the product's own screens and copy.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 22 seconds

## Source Material
- Project root: `/Users/prakharsingh/Desktop/product/baithak`
- Primary files read: `README.md`, `docs/PRODUCT_PLAN.md`, `apps/web/src/app/globals.css`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx` (landing), `apps/web/src/app/(app)/discover/page.tsx`, `apps/web/src/components/plan-card.tsx`, `apps/web/src/components/request-to-join.tsx`, `apps/web/src/components/applicant-desk.tsx`, `apps/web/src/app/(app)/plans/[id]/page.tsx`, `apps/web/src/app/(app)/plans/[id]/room/page.tsx`
- Product name: **Baithak**
- Tagline / strongest claim: **"You don't need a squad to have plans."**
- Key UI to recreate: the `.paper-card` plan flyer (2px near-black border + hard `5px 5px 0` offset shadow), the Request-to-Join panel, the host applicant desk, and the `YOU'RE IN ✓` acceptance stamp.

- Copy that must appear verbatim (all of it is real product copy):
  - `You don't need a squad` / `to have plans.`
  - `GOOD PEOPLE / GOOD NIGHTS` (landing sticker)
  - `3 spots left` · `Host · Ananya ★ 4.8` · `See the crew →` (plan card footer)
  - `Request to join` · `Coming with` · `Solo` / `One friend` / `Group` · `Optional note`
  - `Best matches` · `Why they might fit` · `Accept`
  - `You're in ✓`
  - `Event day mode` · `Today's the day.`
  - `First time` / `Returning member` / `Host` (crew pills)
  - `VERIFIED · 4.8 ★` (sticker)
  - `Find people. Find plans. Make some memories.`

## Creative Direction
- Tone preset: **default**
- Creative direction: *a Bangalore party flyer that comes to life*
- Interpretation: playful but not loud. Motion is **physical and tactile** — paper cards land, stickers rotate on off-axis, stamps hit — never sleek/corporate glide. Six scenes, comfortable pacing, each moment settles before the next. All on-screen words are copy that already exists in the product.
- Angle: Baithak's visual language is a retro party flyer — chunky borders, hard offset shadows, Archivo Black uppercase, cream paper with a dot-grid texture. So the video is a flyer that animates. Every frame is a real Baithak screen doing its actual job; the story is the product's own loop — discover a plan, ask to join, get accepted, meet the crew before you turn up.
- Hook: the landing headline slammed onto cream paper — `YOU DON'T NEED A SQUAD` / `TO HAVE PLANS.` (second line burnt orange).
- Outro / punchline: `TODAY'S THE DAY.` in the party room with the crew already tagged, then the wordmark + *Find people. Find plans. Make some memories.*
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Unrelated visual redesign — do not invent a new look; Baithak's design system is fixed and specified below
  - Rounded/pill surfaces, glassmorphism, gradients, neon — explicitly banned by the product's design system
  - Any real seeded account, email, `.env` value, DB content, or localhost URL on screen

## Visual Identity
- Background: `#F5F0E6` warm cream — plus the body texture: radial dot grid, 0.6px dots, 5px spacing, foreground at ~8% alpha
- Text / borders: `#171717` near-black (borders are always **2px solid**)
- Accent (primary CTA): `#F05A28` burnt orange — primary actions only
- Secondary (playful): `#7657E8` electric purple — used sparingly
- Trust / positive: `#4F8A63` muted green — only for verification/positive signals
- Paper / cards: `#FDF8F0`
- Radius: sharp `0.25rem` — never rounded or pill-shaped surfaces
- Signature treatment: hard offset shadow — `2px 2px 0` / `4px 4px 0` / `5px 5px 0` / `7px 7px 0` of near-black, always paired with `2px` near-black border
- Display font: **Archivo Black** (uppercase, letter-spacing 0, line-height .86)
- Body font: **DM Sans**
- Metadata font: **IBM Plex Mono** — uppercase, bold, ~0.68rem, for stat lines (`SAT 8:30 PM`, `3 spots left`, `VERIFIED · 4.8 ★`)
- The product's real acceptance keyframe, to be reused literally for the stamp:
  `0%: opacity 0, scale(1.8) rotate(-8deg)` → `70%: opacity 1, scale(0.94) rotate(2deg)` → `100%: opacity 1, scale(1) rotate(-2deg)`, 0.35s ease-out
- Visual references from the project: `.paper-card`, `.meta-label`, the off-axis rotated sticker (`rotate(-6deg)` / `rotate(6deg)`), buttons that press in on `:active` (`translate 0.5px`), primary buttons that lift on hover.

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. **The hook** — 3.2s — `YOU DON'T NEED A SQUAD` / `TO HAVE PLANS.` slam in; purple `GOOD PEOPLE / GOOD NIGHTS` sticker rotates in.
2. **The plan flyer** — 4.2s — a real plan card assembles: `SAT 8:30 PM` pill, `KORAMANGALA`, `TERRACE SUNDOWNERS`, 3 vibe pills one by one, footer `3 spots left` · `Host · Ananya ★ 4.8`, `See the crew →`.
3. **Request to join** — 3.8s — cursor clicks `One friend`; a short note types out; the orange `Request to join` button presses in.
4. **The host decides** — 4.2s — `BEST MATCHES` tab, applicant card, two `Why they might fit` reasons reveal, cursor hits `Accept`, `YOU'RE IN ✓` stamp slams down.
5. **The party room** — 3.6s — `TODAY'S THE DAY.` at full scale; three crew chips arrive with `HOST` / `FIRST TIME` / `RETURNING MEMBER` pills.
6. **Wordmark** — 3.0s — `Baithak` + *Find people. Find plans. Make some memories.* + small rotated green `VERIFIED · 4.8 ★` sticker.

Reading-time floor to respect: short label ~0.8s fully settled; a sentence ~0.3s/word, minimum 1.2s. Entrances stay snappy (0.3–0.6s) then HOLD. Do not reveal readable text on every beat.

## Audio
- Audio role: warm bed with tactile, motion-matched accents
- Audio arc: warm fade-in under the hook → tactile paper/UI layer through the middle → one resonant payoff on the stamp at 12.65s → settle and fade out under the wordmark from ~20.5s
- Music: `assets/music/happy-beats-business-moves-vol-9-by-ende-dot-app.mp3` (114.84 BPM, mid-energy, warm)
- Music treatment: volume ~0.34, ~0.4s fade-in at the top, fade out from ~20.5s to the end. Let the stamp SFX ring over the bed rather than ducking it.
- Music cue guidance: bundled preset copied to `assets/music/cues/happy-beats-business-moves-vol-9-by-ende-dot-app.music-cues.json`. Beat spacing ~0.525s.
  - Strong-cue locks (use 2–3, ±0.15s): **4.23s** plan card lands, **12.65s** `YOU'RE IN ✓` stamp, optionally **6.34s** footer trust line resolving.
  - Beat-grid windows (±0.10s): vibe pills at 4.75 / 5.28 / 5.80; `Why they might fit` reasons at 10.54 / 11.60 (**every other beat** — readable text); crew chips at 16.86 / 17.91 / 18.96.
- Audio-reactive treatment: **subtle** — use music RMS/bass so the cards' offset-shadow depth and the cream paper's warmth breathe slightly, and the orange CTA gains a little presence on bass. No waveform bars, no equalizers, no strobing, no particles.
- Audio-coupled moments:
  - Scene 1 headline slam — major reveal hit
  - Scene 1 sticker — light accent
  - Scene 2 card landing — tactile paper hit (beat-locked 4.23s)
  - Scene 2 vibe pills — light sequential accents on the beat grid
  - Scene 3 `One friend` chip — simulated cursor click
  - Scene 3 note field — per-character typing, randomized keypresses, kept quiet
  - Scene 3 send button — crisp click
  - Scene 4 `Accept` — click; then the stamp — the single loudest cue in the video (beat-locked 12.65s)
  - Scene 5 crew chips — light sequential accents
  - Scene 6 wordmark — one soft accent, then nothing
- SFX selection guidance: match the gesture. Paper/card landings want warm, low-HF-risk impacts (`impact/impactSoft_medium_*`); UI actions want clicks (`interface/click_00*`, `ui/click2`); typing wants randomized `keyboard/keypress-*.wav` under the music; the stamp payoff wants one resonant `impact/impactBell_heavy_*`. Roughly 6–8 cues total across 22s — nothing fires without visible motion, nothing stacks on the stamp.
- SFX analysis guidance: `/Users/prakharsingh/.claude/plugins/cache/brag/brag/0.3.0/skills/brag/assets/sfx/sfx-analysis.md` — prefer low/medium HF risk; the `casino/` family is mostly high-risk so use it sparingly if at all.
- Exact SFX choice: Hyperframes chooses filenames, timestamps, density, and volume based on the implemented animation.
- Audio files: copy the chosen SFX into `brag-output/composition/assets/sfx/<family>/`. Music and cue JSON are already in place. Volumes: music 0.34, SFX 0.55–0.85. Music on a low track index (10), each overlapping SFX on its own ascending index (11+).

## Hyperframes Instructions
Load `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, `hyperframes-cli`. This is the `/brag` workflow — do **not** enter the `hyperframes` entry-point intent interview or route into the generic promo / `product-launch-video` workflow. Prefer native Hyperframes conventions over anything in `/brag`.

Requirements:
- Show real Baithak UI, copy, and visual treatment — the `.paper-card` border + hard offset shadow is non-negotiable.
- Keep all text readable in the final render (respect the reading-time floor above).
- Keep the video at 22 seconds.
- Include the music bed and the SFX layer.
- Choose SFX after the visual animation exists; treat `/brag`'s audio notes as guidance, not a fixed cue sheet.
- Beat-lock 2–3 major reveals within ±0.15s of a strong cue and mark them `// beat-locked: <t>s`; snap sequential events within ±0.10s of beat timestamps and mark them `// beat-grid: ...`. Ignore any cue that hurts readability or the product story.
- Wire at least one visual element to per-frame audio data (subtle), or document the extraction failure.
- Use local assets only — never absolute `/Users/...` paths in the composition HTML.
- Run `hyperframes check` before render — it is brag's single gate. Fix every error, including WCAG contrast failures.
