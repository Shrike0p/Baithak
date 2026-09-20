/**
 * The app's sound palette.
 *
 * Two kinds: real recordings listed in SAMPLES, and the rest generated in code
 * so they cost nothing and carry no licence. Both play through one AudioContext,
 * which is what keeps a sound alive when the page navigates out from under it.
 *
 * Sounds mark milestones, never routine interactions — see PRODUCT_PLAN.md.
 */

export type SoundName =
  | "airhorn"
  | "wow"
  | "signOut"
  | "stamp"
  | "shutter"
  | "needleDrop"
  | "cheer";

/**
 * Real recordings, for the sounds where a synthesised version won't do. Anything
 * not listed here is generated in code below — no file, nothing to license.
 */
const SAMPLES: Partial<Record<SoundName, string>> = {
  airhorn: "/sounds/fahhhhh.mp3",
  wow: "/sounds/anime-wow-sound-effect-mp3cut.mp3",
  signOut: "/sounds/tf_nemesis.mp3",
};

let ctx: AudioContext | null = null;

function create(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

/**
 * Wakes the audio engine on the first real interaction with the page.
 *
 * Our sounds fire *after* an await — once a sign-in request comes back, say —
 * and by then the browser no longer counts us as inside a user gesture, so it
 * refuses to start an AudioContext. Doing it during a genuine click avoids that.
 */
export function primeAudio() {
  if (typeof window === "undefined") return;
  const wake = () => {
    const ac = create();
    if (ac && ac.state === "suspended") void ac.resume();
    // Decode the samples up front so there's no lag when one is needed.
    for (const name of Object.keys(SAMPLES) as SoundName[]) void loadSample(name);
  };
  for (const evt of ["pointerdown", "keydown", "touchstart"]) {
    window.addEventListener(evt, wake, { once: true, passive: true });
  }
}

/**
 * Longest any one sound is allowed to run. The clips are 2-5s, which drags when
 * it's playing over a redirect, so they're trimmed here rather than re-encoded —
 * the files stay untouched and the length is a single number to change.
 */
const MAX_SECONDS = 2;
const FADE_SECONDS = 0.25;

const buffers = new Map<SoundName, AudioBuffer>();
const loading = new Map<SoundName, Promise<AudioBuffer | null>>();

/**
 * Fetch + decode a sample once, then keep the raw AudioBuffer.
 *
 * Deliberately not an <audio> element. Those are tied to the page: when a route
 * change unmounted the component that started one, the browser collected it and
 * playback cut out mid-clip. A buffer played through the AudioContext is owned
 * by the audio thread, so once it starts it finishes no matter what React does.
 */
function loadSample(name: SoundName): Promise<AudioBuffer | null> {
  const cached = loading.get(name);
  if (cached) return cached;

  const src = SAMPLES[name];
  const ac = create();
  if (!src || !ac) return Promise.resolve(null);

  const task = fetch(src)
    .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then((bytes) => ac.decodeAudioData(bytes))
    .then((buffer) => {
      buffers.set(name, buffer);
      return buffer;
    })
    .catch((err) => {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[sound] could not load "${name}" from ${src}:`, err);
      }
      return null;
    });

  loading.set(name, task);
  return task;
}

function envelope(ac: AudioContext, node: GainNode, peak: number, attack: number, decay: number) {
  const t = ac.currentTime;
  node.gain.setValueAtTime(0, t);
  node.gain.linearRampToValueAtTime(peak, t + attack);
  node.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

/** Stacked detuned saws with a pitch rise — the actual shape of an air horn. */
function airhorn(ac: AudioContext) {
  const out = ac.createGain();
  out.connect(ac.destination);
  envelope(ac, out, 0.22, 0.04, 1.0);

  // A touch of low-pass keeps it from sounding like a buzzer.
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2600, ac.currentTime);
  filter.connect(out);

  for (const [base, detune] of [[233, -7], [311, 5], [466, 11]] as const) {
    const osc = ac.createOscillator();
    osc.type = "sawtooth";
    osc.detune.value = detune;
    osc.frequency.setValueAtTime(base * 0.94, ac.currentTime);
    osc.frequency.linearRampToValueAtTime(base, ac.currentTime + 0.09);
    osc.connect(filter);
    osc.start();
    osc.stop(ac.currentTime + 1.05);
  }
}

/** Short filtered noise burst plus a low thud — a rubber stamp hitting paper. */
function stamp(ac: AudioContext) {
  const out = ac.createGain();
  out.connect(ac.destination);
  envelope(ac, out, 0.3, 0.001, 0.14);

  const frames = ac.sampleRate * 0.15;
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 3;
  }
  const noise = ac.createBufferSource();
  noise.buffer = buffer;

  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1100;
  noise.connect(filter).connect(out);
  noise.start();

  const thud = ac.createOscillator();
  thud.type = "sine";
  thud.frequency.setValueAtTime(160, ac.currentTime);
  thud.frequency.exponentialRampToValueAtTime(55, ac.currentTime + 0.12);
  const thudGain = ac.createGain();
  envelope(ac, thudGain, 0.35, 0.001, 0.12);
  thud.connect(thudGain).connect(ac.destination);
  thud.start();
  thud.stop(ac.currentTime + 0.14);
}

/** Two bright clicks — mirror slap then shutter, like a disposable camera. */
function shutter(ac: AudioContext) {
  [0, 0.045].forEach((offset, i) => {
    const frames = ac.sampleRate * 0.03;
    const buffer = ac.createBuffer(1, frames, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let n = 0; n < frames; n++) {
      data[n] = (Math.random() * 2 - 1) * (1 - n / frames) ** 6;
    }
    const src = ac.createBufferSource();
    src.buffer = buffer;

    const filter = ac.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = i === 0 ? 2000 : 3200;

    const gain = ac.createGain();
    gain.gain.setValueAtTime(i === 0 ? 0.25 : 0.18, ac.currentTime + offset);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + offset + 0.04);

    src.connect(filter).connect(gain).connect(ac.destination);
    src.start(ac.currentTime + offset);
  });
}

/** A quiet descending blip — used for the routine stuff, like signing back in. */
function needleDrop(ac: AudioContext) {
  const out = ac.createGain();
  out.connect(ac.destination);
  envelope(ac, out, 0.14, 0.01, 0.3);

  const osc = ac.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(660, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(330, ac.currentTime + 0.22);
  osc.connect(out);
  osc.start();
  osc.stop(ac.currentTime + 0.35);
}

/** Filtered noise swell — stands in for a room reacting. */
function cheer(ac: AudioContext) {
  const frames = ac.sampleRate * 0.9;
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    const t = i / frames;
    data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * t) * 0.8;
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;

  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1400;
  filter.Q.value = 0.7;

  const gain = ac.createGain();
  envelope(ac, gain, 0.16, 0.12, 0.8);

  src.connect(filter).connect(gain).connect(ac.destination);
  src.start();
}

/** Synthesised fallbacks. Sample-only sounds (wow, signOut) aren't here. */
const PLAYERS: Partial<Record<SoundName, (ac: AudioContext) => void>> = {
  airhorn,
  stamp,
  shutter,
  needleDrop,
  cheer,
};

/** What the audio engine currently thinks — surfaced on the /sounds dev page. */
export function audioStatus() {
  return {
    contextState: ctx?.state ?? "not created",
    decoded: (Object.keys(SAMPLES) as SoundName[]).filter((n) => buffers.has(n)),
    pending: (Object.keys(SAMPLES) as SoundName[]).filter(
      (n) => loading.has(n) && !buffers.has(n)
    ),
  };
}

export async function playSound(name: SoundName) {
  try {
    const ac = create();
    if (!ac) return;
    // Must finish resuming before scheduling: currentTime doesn't advance while
    // the context is suspended, so anything scheduled against it is lost.
    if (ac.state === "suspended") await ac.resume();
    if (ac.state !== "running") return;

    // A real recording wins over the synthesised stand-in.
    if (SAMPLES[name]) {
      const buffer = buffers.get(name) ?? (await loadSample(name));
      if (!buffer) return;
      const source = ac.createBufferSource();
      source.buffer = buffer;

      const now = ac.currentTime;
      const duration = Math.min(buffer.duration, MAX_SECONDS);
      const fade = Math.min(FADE_SECONDS, duration / 2);

      // Ease the tail out instead of cutting the waveform mid-cycle, which
      // would pop.
      const gain = ac.createGain();
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.setValueAtTime(0.8, now + duration - fade);
      gain.gain.linearRampToValueAtTime(0.0001, now + duration);

      source.connect(gain).connect(ac.destination);
      source.start(now);
      source.stop(now + duration);
      return;
    }

    PLAYERS[name]?.(ac);
  } catch (err) {
    // Audio is a nicety — never let it break the thing it's decorating. But
    // failing silently made a real bug invisible, so say something in dev.
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[sound] "${name}" did not play:`, err);
    }
  }
}
