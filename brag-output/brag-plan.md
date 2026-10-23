# Brag Plan: Baithak

## What is this app?
Baithak helps you find trusted small-group social plans in Bangalore — house parties, dinners, game nights — and meet the crew *before* you turn up. Events are the surface; people and trust are the product.

## The angle
Baithak's whole visual language is a **retro party flyer** — chunky 2px black borders, hard offset shadows, Archivo Black uppercase, cream paper with a dot-grid texture, stamp-style stickers. So the video is a flyer that animates: cards land with a physical *thunk*, pills stick on, and the real `YOU'RE IN ✓` stamp slams down exactly as it does in the product. Nothing abstract, nothing invented — every frame is a Baithak screen doing its actual job.

The joke isn't a joke. The angle is: **watch a stranger become a guest in 22 seconds.** The product's own loop is the story.

## Hook (first 2-3 seconds)
The landing headline, verbatim, slammed onto cream paper in Archivo Black:
**"YOU DON'T NEED A SQUAD"** → **"TO HAVE PLANS."** (second line in Burnt Orange)
The `GOOD PEOPLE / GOOD NIGHTS` purple sticker rotates in off-axis. It earns the next 20 seconds because it names the exact problem in seven words.

## Key moments (the middle)
- The plan flyer card assembling itself — photo, `SAT 8:30 PM` pill, `KORAMANGALA`, `TERRACE SUNDOWNERS`, vibe pills, and the footer line that does the real work: `3 spots left` · `Host · Ananya ★ 4.8`.
- A cursor actually picking `One friend` in Request to Join and typing a note to the host — the thing that makes this an application, not a ticket purchase.
- The host's applicant desk: `Best matches` tab, `Why they might fit` reasons, and a cursor hitting **Accept**.
- The `YOU'RE IN ✓` stamp landing with Baithak's real `stamp-in` keyframe (scale 1.8 / −8° → settle at −2°).

## Outro / punchline
The party room: **"TODAY'S THE DAY."** at full scale, the crew already tagged `FIRST TIME` / `RETURNING MEMBER` — the payoff is that you know these people before the door opens. Then the wordmark and the product's own line: *Find people. Find plans. Make some memories.*

## User flow worth showing
Three beats, all real screens:
1. **Entry** — Discover: a plan flyer card with spots left and a host trust score.
2. **Key action** — Request to join: pick who you're coming with, write the host a note, send.
3. **Result** — Host accepts → `YOU'RE IN ✓` → the party room opens with the crew already there.

## Tone
- Preset: **default**
- Creative direction: *a Bangalore party flyer that comes to life*
- Interpretation: Playful but not loud. Motion is physical and tactile (cards land, stamps hit, stickers rotate) rather than sleek or corporate. Comfortable pacing — six scenes, each moment gets to settle. Warm, human copy only; every word on screen is copy that already exists in the product.

## Format: landscape — 1920x1080
## Duration: 22 seconds

## Visual identity (from the project)
- Background: `#F5F0E6` warm cream (`oklch(95% 0.018 82)`), with the body dot-grid texture: 0.6px radial dots at 5px spacing, foreground at 8% alpha
- Text / borders: `#171717` near-black (`oklch(20% 0 0)`)
- Accent (primary CTA): `#F05A28` burnt orange (`oklch(67% 0.19 42)`)
- Secondary (playful): `#7657E8` electric purple (`oklch(58% 0.19 291)`)
- Trust / positive: `#4F8A63` muted green (`oklch(57% 0.11 145)`)
- Paper / cards: `#FDF8F0` (`oklch(98% 0.012 82)`)
- Display font: **Archivo Black**, uppercase, leading `.86`
- Body font: **DM Sans**
- Metadata font: **IBM Plex Mono**, uppercase, `.68rem`, bold (`.meta-label`)
- Strongest visual element: the `.paper-card` — 2px near-black border + hard `5px 5px 0` offset shadow, sharp `0.25rem` radius. Plus the `stamp-in` keyframe used for acceptance.

## Share copy (draft)
Built Baithak — find a house party in Bangalore, see who's actually going, and meet the crew before you turn up. You don't need a squad to have plans.

## Audio direction
- Role: warm bed with tactile, motion-matched accents
- Music: `happy-beats-business-moves-vol-9-by-ende-dot-app.mp3` — mid-energy, warm, 114.84 BPM. Less hyped than vol-1, which suits a product about people rather than hustle.
- Music treatment: start at 0, volume ~0.34, short fade-in over the first 0.4s, fade out under the final wordmark from ~20.5s. Let the `YOU'RE IN ✓` payoff SFX ring over the bed.
- Music cue guidance: bundled preset read from `<skill-dir>/assets/music/cues/happy-beats-business-moves-vol-9-by-ende-dot-app.music-cues.json` (114.84 BPM, ~0.525s per beat). Strong cues to target: **4.23s** (plan card lands), **12.65s** (YOU'RE IN stamp), optionally **6.34s** (footer trust line). Beat-grid windows for sequential reveals: vibe pills 4.75 / 5.28 / 5.80; "why they might fit" reasons 10.54 / 11.60 (every *other* beat — these are readable text); crew chips 16.86 / 17.91 / 18.96.
- Audio-reactive treatment: subtle — use music RMS to let the cream paper's warmth and the cards' offset-shadow depth breathe very slightly, and give the orange CTA a soft presence lift on bass. No waveform bars, no equalizers, no strobing.
- SFX posture: moderate — roughly 6-8 cues across 22s, every one matched to a visible motion. Nothing fires without something moving.
- Audio-coupled moments: headline slam; plan card landing; vibe pills sticking on one by one; cursor click on `One friend`; per-character typing on the host note; the Accept click; the stamp payoff; crew chips arriving.
- Restraint rule: no sound on a cut that has no motion, no stacked hits, and the typing layer stays under the music — the stamp is the loudest thing in the video and nothing competes with it.

## Storyboard

### Scene 1 — The hook — 3.2s
Cream paper, dot-grid texture. `YOU DON'T NEED A SQUAD` slams in (Archivo Black, uppercase, leading .86) at 0.3s; `TO HAVE PLANS.` follows in burnt orange at 0.9s. The purple `GOOD PEOPLE / GOOD NIGHTS` sticker rotates in at ~1.5s, off-axis, with a hard offset shadow. Both lines hold fully settled until 3.2s.
Sequential/interaction: yes — two headline lines land in sequence, then the sticker.
Audio intent: the bed starts warm; one dry impact gives the headline physical weight.
Audio-coupled idea: headline slam + a lighter accent for the sticker.
Music: warm mid-energy bed, fading in.
Transition mood: clean → Scene 2

### Scene 2 — The plan flyer — 4.2s
A real Baithak `.paper-card` assembles centre-frame: the photo block with an orange `SAT 8:30 PM` pill top-left, then the body — `KORAMANGALA` in mono meta, the title `TERRACE SUNDOWNERS` in display uppercase, three vibe pills, and the bordered footer row `3 spots left` (orange, because ≤3) · `Host · Ananya ★ 4.8`, with `See the crew →` beneath. The card lands with its 5px offset shadow snapping into place.
Sequential/interaction: yes — card lands first, then the three vibe pills stick on one by one, then the footer row draws in.
Audio intent: tactile and physical — this is paper hitting a table.
Audio-coupled idea: card-landing hit on the card, light card/drop sounds per pill, a soft chip sound as the trust line resolves.
Music: bed continues, card lands on a strong cue (~4.23s).
Transition mood: clean → Scene 3

### Scene 3 — Request to join — 3.8s
The Request to Join panel. Heading `REQUEST TO JOIN`, then the mono label `COMING WITH` above three chips: `Solo` / `One friend` / `Group`. A cursor moves in and clicks **One friend** — the chip fills orange. Below, `OPTIONAL NOTE` and a field where a short note types out character by character: *"Bringing my flatmate — we'll carry dessert."* The orange `Request to join` button then presses in (translate 0.5px, the product's real `:active`).
Sequential/interaction: yes — simulated cursor click on a chip, then per-character typing, then a button press.
Audio intent: the sound of someone actually using the app.
Audio-coupled idea: mouse click on the chip, randomized keypresses under the typing, a crisp click on the send button.
Music: bed steady.
Transition mood: clean → Scene 4

### Scene 4 — The host decides — 4.2s
The host's applicant desk, tightened to what matters: the `BEST MATCHES` tab active in orange, one applicant card, and under `WHY THEY MIGHT FIT` two reasons appear as bulleted lines (orange dots), each held long enough to read. A cursor hits the green **Accept** button — and the `YOU'RE IN ✓` stamp slams over the frame using Baithak's real `stamp-in` keyframe: scale 1.8 at −8°, overshoot to 0.94 at +2°, settle at −2°.
Sequential/interaction: yes — two reason lines reveal on every *other* beat (10.54s, 11.60s), then a simulated Accept click.
Audio intent: this is the payoff of the whole video — one clean, resonant hit, nothing layered on top of it.
Audio-coupled idea: soft drop per reason line, a click on Accept, and a single bell/impact on the stamp landing.
Music: stamp beat-locked to the strong cue at **12.65s**; the hit rings over the bed.
Transition mood: hard → Scene 5

### Scene 5 — The party room — 3.6s
`TODAY'S THE DAY.` fills the frame in display uppercase, with the mono kicker `EVENT DAY MODE` above it. Three crew chips arrive one by one along the lower third — avatar, name, and a pill reading `HOST` (orange) / `FIRST TIME` (plain) / `RETURNING MEMBER` (green). The point lands without a caption: you already know who's going.
Sequential/interaction: yes — three crew chips arrive on the beat grid (16.86 / 17.91 / 18.96), each held after arrival.
Audio intent: warm and social — the room filling up.
Audio-coupled idea: a light card/drop sound per crew chip.
Music: bed at full warmth.
Transition mood: soft → Scene 6

### Scene 6 — Wordmark — 3.0s
Cream paper clears to the `Baithak` wordmark centred, with the product's own line beneath in DM Sans: *Find people. Find plans. Make some memories.* The green `VERIFIED · 4.8 ★` sticker sits small and off-axis, rotated, as the last piece of texture. Hold on stillness.
Sequential/interaction: none.
Audio intent: settle and close — the bed fades out under the line rather than cutting.
Audio-coupled idea: one soft accent as the wordmark sets, then nothing.
Music: fade out from ~20.5s to the end.
Transition mood: end.

**Music mood for this video:** upbeat but warm — mid-energy, human, not corporate hustle.
**Audio summary:** A warm 114 BPM bed runs the full 22s under tactile, motion-matched accents — paper hits, chip clicks, typing, crew cards — building to a single resonant stamp on the `YOU'RE IN ✓` payoff at 12.65s, then settling into a clean fade under the wordmark.

## Privacy note
Every name, note, neighbourhood and rating on screen is fictional stand-in content in the product's own format. No seeded accounts, real emails, database contents, `.env` values, or localhost URLs appear in any frame.
