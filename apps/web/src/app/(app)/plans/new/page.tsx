"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, ChevronRight, Copy, Eye, ImagePlus, LockKeyhole, Share2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { createPlan, getMe, type PlanSummary } from "@/lib/api";
import { PlanCard } from "@/components/plan-card";
import { DateTimePicker } from "@/components/date-time-picker";
import { RetroSelect, type RetroOption } from "@/components/retro-select";
import { uploadImage } from "@/lib/upload";
import { COVER_PRESETS } from "@/lib/plan-art";
import { useSound } from "@/lib/use-sound";
import {
  LAUNCH_AREAS,
  MAX_AREA_LENGTH,
  normalizeArea,
  parseChipIn,
  normalizeUpiId,
  chipInLabel,
  MAX_CHIP_IN,
  MAX_CHIP_IN_NOTE,
  profileSteps,
  HOST_REQUIRABLE,
  RSVP_QUESTIONS,
  DEFAULT_RSVP_QUESTIONS,
  MAX_RSVP_QUESTIONS,
} from "@baithak/types";
import { Button, Pill } from "@/components/ui";

const CATEGORIES = [
  { value: "HOUSE_PARTY", label: "House Party", emoji: "🪩" },
  { value: "DRINKS", label: "Drinks", emoji: "🍻" },
  { value: "DINNER", label: "Dinner", emoji: "🍝" },
  { value: "GAME_NIGHT", label: "Game Night", emoji: "🎲" },
  { value: "MOVIE", label: "Screening", emoji: "🍿" },
  { value: "SPORTS", label: "Sports", emoji: "🏸" },
  { value: "TRIP", label: "Trip", emoji: "🎒" },
  { value: "OTHER", label: "Other", emoji: "✨" },
];

const CAPACITIES = [8, 12, 16];

/**
 * Now, as a datetime-local value — the earliest a plan may start.
 *
 * Cached on first call because useSyncExternalStore re-renders forever if
 * getSnapshot hands back a fresh value each time. Pinning it to page load is
 * fine: this is a floor on a date picker, not a live clock, and the API
 * re-checks the time on submit anyway.
 */
let cachedLocalNow: string | null = null;
function localNow() {
  cachedLocalNow ??= new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
  return cachedLocalNow;
}
const VIBES = ["Music", "Drinks", "Dancing", "Chill", "Food", "Games", "Bollywood", "Outdoors"];

function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="paper-card p-5">
      <h2 className="mb-5 text-xl uppercase">{title}</h2>
      {children}
    </section>
  );
}

/**
 * The moment after a plan exists.
 *
 * A plan nobody knows about is the same as no plan, so this screen has exactly
 * one job — hand the host something to paste — and everything else on it is
 * secondary. The message is written for them rather than left blank, because
 * "share this" and an empty box is how a link never gets sent.
 */
function PlanCreated({
  planId,
  title,
  neighborhood,
  startsAt,
  capacity,
  chipIn,
}: {
  planId: string;
  title: string;
  neighborhood: string;
  startsAt: string;
  capacity: number;
  chipIn: number | null;
}) {
  const [copied, setCopied] = useState<"link" | "message" | null>(null);
  const [sending, setSending] = useState(false);

  const when = startsAt
    ? new Date(startsAt).toLocaleString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    })
    : "";
  // window isn't there on the server, and this screen only ever renders after a
  // click, so building the URL at render time is safe.
  const url = typeof window === "undefined" ? "" : `${window.location.origin}/plans/${planId}`;
  const message = `${title} — ${neighborhood}, ${when}. ${capacity} spots${chipIn ? `, ${chipInLabel(chipIn)}` : ""}.\nAsk to come: ${url}`;

  async function copy(what: "link" | "message") {
    try {
      await navigator.clipboard.writeText(what === "link" ? url : message);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt("Copy this", what === "link" ? url : message);
    }
  }

  /** The poster as a file, or null if it couldn't be fetched. */
  async function posterFile(): Promise<File | null> {
    try {
      const res = await fetch(`/plans/${planId}/poster`);
      if (!res.ok) return null;
      return new File([await res.blob()], `${title || "baithak"}.jpg`, { type: "image/jpeg" });
    } catch {
      return null;
    }
  }

  /**
   * Share the poster, and make sure the message survives.
   *
   * Most share targets silently discard `text` and `url` the moment a file is
   * attached — WhatsApp, Instagram and the macOS sheet all do it, and there's
   * no way to ask whether they will. So the message goes on the clipboard
   * first, in the same user gesture (Safari rejects a clipboard write that
   * comes after an await), and the button says so afterwards. The host sends
   * the image, pastes the caption, and the link isn't lost.
   */
  async function share() {
    let copiedForShare = false;
    try {
      await navigator.clipboard.writeText(message);
      copiedForShare = true;
    } catch {
      // No clipboard permission — the message is on screen to copy by hand.
    }

    setSending(true);
    const file = await posterFile();
    setSending(false);

    if (file && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: message });
        if (copiedForShare) {
          setCopied("message");
          setTimeout(() => setCopied(null), 6000);
        }
        return;
      } catch {
        // Cancelled, or the target refused the file — fall through to text.
      }
    }
    if (navigator.share) {
      try {
        await navigator.share({ title, text: message, url });
        return;
      } catch {
        // Cancelled — copying is a fine second best.
      }
    }
    await copy("message");
  }

  /**
   * Share the poster as a file where the browser allows it, otherwise download.
   *
   * The file route is what puts it straight into an Instagram story from a
   * phone; canShare({ files }) is the only honest way to ask, since Safari and
   * Chrome disagree about what they'll accept.
   */
  /** Straight to disk — for the desktop case where there's nothing to share to. */
  async function downloadPoster() {
    const file = await posterFile();
    if (!file) return;
    const href = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = href;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(href);
  }

  return (
    <div className="mx-auto max-w-2xl px-5 pb-24 pt-10 md:px-8">
      <div className="animate-stamp rotate-[-2deg] border-4 border-accent p-4 text-center font-display text-3xl uppercase text-accent">
        It&apos;s live
      </div>

      <div className="paper-card mt-8 p-6">
        <h1 className="text-4xl uppercase truncate">{title}</h1>
        <p className="mt-2 font-mono text-sm font-bold">
          {neighborhood} · {when} · {capacity} spots
        </p>

        <p className="mt-6 text-muted-foreground">
          Nobody can ask to come until they see it. Send it to the people you
          actually want there — the first three or four decide who else turns up.
        </p>

        <div className="mt-5 border-2 border-foreground bg-muted p-4">
          <p className="whitespace-pre-line text-sm wrap-break-word">{message}</p>
        </div>

        <div className="mt-5 flex gap-4">
          <Image
            src={`/plans/${planId}/poster`}
            alt="The poster for this plan"
            width={108}
            height={192}
            unoptimized
            className="h-auto w-28 shrink-0 border-2 border-foreground shadow-stamp-sm"
          />
          <div className="flex flex-col justify-center gap-3">
            <p className="text-sm text-muted-foreground">
              Send it attaches this. Save it if you&apos;d rather post it
              yourself — it&apos;s story-shaped, for the chats where a link
              preview never shows up.
            </p>
            <button
              type="button"
              onClick={() => void downloadPoster()}
              className="inline-flex h-11 w-fit items-center gap-2 border-2 border-foreground bg-card px-4 font-bold uppercase shadow-stamp-sm transition-transform active:translate-x-0.5 active:translate-y-0.5"
            >
              <ImagePlus className="size-4" /> Save the image
            </button>
          </div>
        </div>

        {copied === "message" && (
          <p className="mt-4 border-2 border-accent bg-card p-3 text-sm font-bold text-accent">
            Message copied. Most apps drop the text when you send a picture —
            paste it under the image.
          </p>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void share()}
            className="inline-flex h-11 items-center justify-center gap-2 border-2 border-foreground bg-primary font-bold uppercase text-primary-foreground shadow-stamp-sm transition-transform active:translate-x-0.5 active:translate-y-0.5"
          >
            <Share2 className="size-4" /> {sending ? "Getting the poster…" : "Send it, with the poster"}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 border-2 border-foreground bg-card font-bold uppercase shadow-stamp-sm transition-transform active:translate-x-0.5 active:translate-y-0.5"
          >
            WhatsApp
          </a>
          <button
            type="button"
            onClick={() => void copy("message")}
            className="inline-flex h-11 items-center justify-center gap-2 border-2 border-foreground bg-card font-bold uppercase transition-transform active:translate-x-0.5 active:translate-y-0.5"
          >
            {copied === "message" ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied === "message" ? "Copied" : "Copy message"}
          </button>
          <button
            type="button"
            onClick={() => void copy("link")}
            className="inline-flex h-11 items-center justify-center gap-2 border-2 border-foreground bg-card font-bold uppercase transition-transform active:translate-x-0.5 active:translate-y-0.5"
          >
            {copied === "link" ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied === "link" ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-5">
        <Link href={`/plans/${planId}`} className="font-bold uppercase underline">
          Open the plan
        </Link>
        <Link href="/host" className="font-bold uppercase text-muted-foreground underline">
          Back to hosting
        </Link>
      </div>
    </div>
  );
}

// Stored as the host's preference only — nothing filters on it yet, so the
// hints describe intent and never promise enforcement.
const CONNECTION_OPTIONS: RetroOption[] = [
  { value: "OPEN", label: "Open to new people", hint: "Strangers welcome — the whole point" },
  { value: "FRIENDS_OF_FRIENDS", label: "Friends of friends", hint: "You'd rather people with a mutual" },
  { value: "COMMUNITY", label: "Community members", hint: "You'd rather Baithak regulars" },
  { value: "INVITE_ONLY", label: "Invite only", hint: "Mostly people you send the link to" },
];

/**
 * One collapsed setting, showing its current value on the closed row.
 *
 * Native <details> rather than managed state: it comes with keyboard support
 * and the disclosure triangle for free, and there's no open/closed state to get
 * out of sync. The value on the summary is the whole point — a fold that hides
 * what it's set to just trades a wall of inputs for a guessing game.
 */
function Fold({
  label,
  value,
  alert = false,
  children,
}: {
  label: string;
  value: string;
  /** Pull the eye back to a row whose value is now invalid. */
  alert?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="group border-b-2 border-foreground last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 hover:bg-muted">
        <span className="font-bold uppercase">{label}</span>
        <span className="flex items-center gap-2">
          <span
            className={`font-mono text-xs font-bold ${alert ? "text-primary" : "text-muted-foreground"
              }`}
          >
            {value}
          </span>
          <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
        </span>
      </summary>
      <div className="px-5 pb-5">{children}</div>
    </details>
  );
}

function Chip({
  active,
  onClick,
  children,
  disabled = false,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  /** The host-facing reason to turn this on — a tooltip, never guest copy. */
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-sm border-2 border-foreground px-4 py-2 font-bold transition-transform duration-150 active:translate-x-0.5 active:translate-y-0.5 ${active
          ? "bg-primary text-primary-foreground shadow-stamp-sm"
          : disabled
            ? "cursor-not-allowed bg-background opacity-40"
            : "bg-background hover:bg-muted"
        }`}
    >
      {children}
    </button>
  );
}

const STEPS = ["The basics", "Place & look", "Who comes"] as const;

/** The real Discover card, fed the form's current values. */
function Preview({ plan }: { plan: PlanSummary }) {
  return (
    <div>
      <p className="meta-label text-muted-foreground">How it looks in Discover</p>
      {/* inert: it's a picture of the card, not a link to a plan that doesn't exist yet. */}
      <div inert className="mt-3">
        <PlanCard plan={plan} />
      </div>
    </div>
  );
}

export default function MakeAPlanPage() {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("HOUSE_PARTY");
  const [startsAt, setStartsAt] = useState("");
  const [neighborhood, setNeighborhood] = useState<string>("");
  const [exactAddress, setExactAddress] = useState("");
  const [capacity, setCapacity] = useState(12);
  // The clock is an external store, same as Countdown does it: the server and
  // the browser sit in different timezones, so a floor computed during render
  // mismatches on hydration. Empty on the server = no floor until mounted.
  const minStartsAt = useSyncExternalStore(
    () => () => { },
    () => localNow(),
    () => "",
  );
  const [vibeTags, setVibeTags] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState(COVER_PRESETS[0].url);
  // Held as the typed text, not numbers: a number state turns a cleared field
  // into 0 on the spot, so you couldn't empty it and type a fresh value.
  const [ageMinText, setAgeMin] = useState("23");
  const [ageMaxText, setAgeMax] = useState("30");
  const [womenText, setTargetWomen] = useState("6");
  const [menText, setTargetMen] = useState("6");
  const ageMin = Number(ageMinText);
  const ageMax = Number(ageMaxText);
  const targetWomen = Number(womenText) || 0;
  const targetMen = Number(menText) || 0;
  const agesValid =
    ageMinText !== "" && ageMaxText !== "" && ageMin >= 18 && ageMax <= 40 && ageMin <= ageMax;
  const [requiredOfGuests, setRequiredOfGuests] = useState<string[]>([]);
  const [rsvpQuestions, setRsvpQuestions] = useState<string[]>(DEFAULT_RSVP_QUESTIONS);
  const [houseRules, setHouseRules] = useState("");
  const [paid, setPaid] = useState(false);
  const [chipInText, setChipInText] = useState("");
  const [chipInNote, setChipInNote] = useState("");
  const chipIn = paid ? parseChipIn(chipInText) : null;
  const [upiText, setUpiText] = useState("");
  const upiId = normalizeUpiId(upiText);
  const [askPhone, setAskPhone] = useState(false);
  // With money involved the host has to be able to reach people, so a chip-in
  // turns this on and locks it — the API enforces the same.
  const phoneAsked = askPhone || paid;
  const [connectionPreference, setConnectionPreference] = useState("OPEN");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  // The plan exists the moment this is set — the form is done, and what's left
  // is the only job that matters next: getting the link in front of people.
  const [createdId, setCreatedId] = useState<string | null>(null);
  const { play } = useSound();
  // Held until the plan exists: a cover is stored under covers/<planId>/, and
  // there's no planId until the plan is created.
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const previewDialog = useRef<HTMLDialogElement>(null);
  const [host, setHost] = useState({ name: "You", trustScore: 0 });

  // Only for the preview card's "Host · name ★" line.
  useEffect(() => {
    getMe()
      .then((me) => setHost({ name: me.name, trustScore: me.trustScore }))
      .catch(() => {});
  }, []);

  const toggleVibe = (v: string) =>
    setVibeTags((tags) => (tags.includes(v) ? tags.filter((t) => t !== v) : [...tags, v]));

  // Same rules the API enforces, surfaced per step so "Next" means something.
  const mixOverflows = targetWomen + targetMen > capacity;
  const tooEarly = Boolean(startsAt && minStartsAt && startsAt < minStartsAt);
  const stepGaps = [
    [
      !title.trim() && "a name",
      !startsAt && "a time",
      tooEarly && "a time that hasn't passed",
      paid && chipIn === null && `a chip-in between ₹1 and ₹${MAX_CHIP_IN.toLocaleString("en-IN")}`,
      paid && !upiId && "your UPI ID (like name@bank) for the chip-in",
    ],
    [!normalizeArea(neighborhood) && "an area", !exactAddress.trim() && "the exact address"],
    [!agesValid && "an age range between 18 and 40", mixOverflows && "a group mix that fits"],
  ].map((gaps) => gaps.filter(Boolean) as string[]);
  const stepDone = stepGaps.map((g) => g.length === 0);
  const canSubmit = stepDone.every(Boolean) && status !== "saving";
  const gaps = stepGaps[step];

  const preview: PlanSummary = {
    id: "preview",
    title: title.trim() || "Your plan's name",
    category,
    vibeTags,
    neighborhood: normalizeArea(neighborhood) || "Your area",
    imageUrl: coverPreview ?? imageUrl,
    startsAt: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
    capacity,
    chipIn,
    confirmedCount: 0,
    host: { id: "you", name: host.name, image: null, trustScore: host.trustScore },
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Enter in a field on an early step means "next", not "create".
    if (step < STEPS.length - 1) {
      if (stepDone[step]) setStep(step + 1);
      return;
    }
    if (!canSubmit) return;
    setStatus("saving");
    try {
      const plan = await createPlan({
        title: title.trim(),
        category,
        startsAt: new Date(startsAt).toISOString(),
        neighborhood: normalizeArea(neighborhood),
        exactAddress: exactAddress.trim(),
        capacity,
        vibeTags,
        imageUrl,
        requiredOfGuests,
        rsvpQuestions,
        houseRules: houseRules.trim() || undefined,
        chipIn: chipIn ?? undefined,
        chipInNote: (chipIn && chipInNote.trim()) || undefined,
        upiId: (chipIn && upiId) || undefined,
        askPhone: phoneAsked,
        crowd: { ageMin, ageMax, targetWomen, targetMen, connectionPreference, preferredVibes: vibeTags },
      });
      // Upload after creation, then attach. A failed upload shouldn't lose the
      // plan someone just filled in a form to make — they land on it either
      // way and can set the cover from there.
      if (coverFile) {
        try {
          const { objectKey } = await uploadImage(coverFile, "cover", plan.id);
          await fetch(`/api/plans/${plan.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ objectKey }),
          });
        } catch {
          // Falls back to the preset they picked.
        }
      }

      play("stamp");
      setCreatedId(plan.id);
    } catch {
      setStatus("error");
    }
  }

  if (createdId) {
    return (
      <PlanCreated
        planId={createdId}
        title={title.trim()}
        neighborhood={neighborhood}
        startsAt={startsAt}
        capacity={capacity}
        chipIn={chipIn}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-6xl px-5 pb-24 pt-10 md:px-8">
      <p className="meta-label text-primary">Host mode</p>
      <h1 className="mt-3 text-5xl uppercase md:text-7xl">Make a plan</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Put the idea out there. Keep the address private.
      </p>

      {/* Steps: done ones stay clickable, so going back to fix a detail is one tap. */}
      <ol className="mt-8 grid grid-cols-3 gap-2">
        {STEPS.map((label, i) => {
          const reachable = i <= step || stepDone.slice(0, i).every(Boolean);
          return (
            <li key={label}>
              <button
                type="button"
                disabled={!reachable}
                onClick={() => setStep(i)}
                aria-current={i === step ? "step" : undefined}
                className="group w-full text-left disabled:cursor-not-allowed"
              >
                <span
                  className={`block h-2.5 border-2 border-foreground ${
                    i < step ? "bg-accent" : i === step ? "bg-primary" : "bg-card"
                  }`}
                />
                <span
                  className={`mt-2 flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase ${
                    i === step ? "" : "text-muted-foreground"
                  }`}
                >
                  {i < step && stepDone[i] ? <Check className="size-3" strokeWidth={3} /> : `${i + 1}.`}
                  <span className="truncate">{label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {step === 0 && (
            <>
              <Field title="What are you calling it?">
                <input
                  value={title}
                  maxLength={40}
                  autoFocus
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Saturday House Party"
                  className="w-full rounded-sm border-2 border-foreground bg-background p-3 outline-none focus:shadow-stamp-sm"
                />
              </Field>

              <Field title="What kind of plan?">
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <Chip key={c.value} active={category === c.value} onClick={() => setCategory(c.value)}>
                      <span aria-hidden className="mr-1.5">{c.emoji}</span>
                      {c.label}
                    </Chip>
                  ))}
                </div>
              </Field>

              <div className="grid gap-6 sm:grid-cols-2">
                <Field title="When?">
                  <DateTimePicker value={startsAt} onChange={setStartsAt} min={minStartsAt} />
                </Field>

                <Field title="How many people?">
                  <div className="flex flex-wrap items-center gap-2">
                    {CAPACITIES.map((c) => (
                      <Chip key={c} active={capacity === c} onClick={() => setCapacity(c)}>
                        {c}
                      </Chip>
                    ))}
                  </div>
                </Field>
              </div>

              <Field title="Is there a chip-in?">
                <div className="flex flex-wrap gap-2">
                  <Chip active={!paid} onClick={() => setPaid(false)}>
                    Free
                  </Chip>
                  <Chip active={paid} onClick={() => setPaid(true)}>
                    Guests chip in
                  </Chip>
                </div>
                {paid && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-[10rem_1fr]">
                    <label className="flex flex-col gap-1.5">
                      <span className="meta-label text-muted-foreground">Per person</span>
                      <span className="flex items-center rounded-sm border-2 border-foreground bg-background focus-within:shadow-stamp-sm">
                        <span className="pl-3 font-bold">₹</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={MAX_CHIP_IN}
                          value={chipInText}
                          onChange={(e) => setChipInText(e.target.value)}
                          placeholder="300"
                          className="w-full bg-transparent p-3 pl-1.5 outline-none"
                        />
                      </span>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="meta-label text-muted-foreground">
                        What it covers <span className="normal-case">(optional)</span>
                      </span>
                      <input
                        value={chipInNote}
                        maxLength={MAX_CHIP_IN_NOTE}
                        onChange={(e) => setChipInNote(e.target.value)}
                        placeholder="Food, snacks & the space"
                        className="w-full rounded-sm border-2 border-foreground bg-background p-3 outline-none focus:shadow-stamp-sm"
                      />
                    </label>
                  </div>
                )}
                {paid && (
                  <label className="mt-3 flex flex-col gap-1.5">
                    <span className="meta-label text-muted-foreground">Your UPI ID</span>
                    <input
                      value={upiText}
                      onChange={(e) => setUpiText(e.target.value)}
                      onBlur={() => upiId && setUpiText(upiId)}
                      placeholder="yourname@okaxis"
                      autoCapitalize="none"
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full rounded-sm border-2 border-foreground bg-background p-3 font-mono outline-none focus:shadow-stamp-sm"
                    />
                    <span className="text-xs text-muted-foreground">
                      Required with a chip-in. Accepted guests get a &ldquo;Pay&rdquo; button that
                      opens their UPI app with this filled in — only people you accept ever see it.
                      Guests will also be asked for their phone number.
                    </span>
                  </label>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  {paid
                    ? "Guests pay you directly — UPI or at the door. Baithak doesn't handle the money. Keep it to food and the space: charging for alcohol needs a licence."
                    : "Most plans here are free. Asking for a chip-in is fine for food or a booked space."}
                </p>
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <Field title="Where?">
                <input
                  value={neighborhood}
                  maxLength={MAX_AREA_LENGTH}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  onBlur={() => setNeighborhood(normalizeArea(neighborhood))}
                  placeholder="Area, e.g. Koramangala"
                  aria-label="Area"
                  className="w-full rounded-sm border-2 border-foreground bg-background p-3 outline-none focus:shadow-stamp-sm"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {LAUNCH_AREAS.map((area) => (
                    <Chip
                      key={area}
                      active={normalizeArea(neighborhood) === area}
                      onClick={() => setNeighborhood(area)}
                    >
                      {area}
                    </Chip>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  <LockKeyhole className="mr-1 inline size-3" />
                  This is the only location shown publicly.
                </p>
                <input
                  value={exactAddress}
                  maxLength={60}
                  onChange={(e) => setExactAddress(e.target.value)}
                  placeholder="Exact address"
                  className="mt-3 w-full rounded-sm border-2 border-foreground bg-background p-3 outline-none focus:shadow-stamp-sm"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Required, and only ever shown to guests you accept.
                </p>
              </Field>

              <Field title="Pick a cover">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {COVER_PRESETS.map((cover) => {
                    const on = !coverPreview && imageUrl === cover.url;
                    return (
                      <button
                        key={cover.url}
                        type="button"
                        onClick={() => setImageUrl(cover.url)}
                        aria-pressed={on}
                        className={`overflow-hidden rounded-sm border-2 border-foreground transition-transform duration-150 hover:-translate-y-0.5 ${on ? "shadow-stamp" : "opacity-60"
                          }`}
                      >
                        <Image
                          src={cover.url}
                          alt={cover.label}
                          width={400}
                          height={300}
                          className="aspect-4/3 w-full object-cover"
                        />
                        <span className="meta-label block border-t-2 border-foreground bg-background py-1">
                          {cover.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => coverInput.current?.click()}
                    className="inline-flex h-11 items-center gap-2 border-2 border-foreground bg-card px-4 font-bold uppercase shadow-stamp-sm transition-transform active:translate-x-0.5 active:translate-y-0.5"
                  >
                    <ImagePlus className="size-4" />
                    {coverFile ? "Change photo" : "Use your own photo"}
                  </button>

                  {coverPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setCoverFile(null);
                        setCoverPreview(null);
                        if (coverInput.current) coverInput.current.value = "";
                      }}
                      className="font-mono text-xs font-bold uppercase text-muted-foreground hover:text-foreground"
                    >
                      Remove my photo
                    </button>
                  )}

                  <input
                    ref={coverInput}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setCoverFile(file);
                      setCoverPreview(file ? URL.createObjectURL(file) : null);
                    }}
                  />
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  {coverFile
                    ? "Your photo is in the preview, and goes up once the plan is created."
                    : "Your own photo beats a preset — people can tell."}
                </p>
              </Field>

              <Field title="What's the vibe?">
                <div className="flex flex-wrap gap-2">
                  {VIBES.map((v) => (
                    <button key={v} type="button" onClick={() => toggleVibe(v)}>
                      <Pill tone={vibeTags.includes(v) ? "purple" : "plain"}>{v}</Pill>
                    </button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {step === 2 && (
            <section className="paper-card">
              <div className="border-b-2 border-foreground p-5">
                <h2 className="text-xl uppercase">Who comes</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  All optional, all changeable after it&apos;s live. The defaults are
                  fine — open only what you actually care about.
                </p>
              </div>

              <Fold
                label="Who can request"
                value={CONNECTION_OPTIONS.find((o) => o.value === connectionPreference)?.label ?? ""}
              >
                <RetroSelect
                  label="Who can request"
                  value={connectionPreference}
                  onChange={setConnectionPreference}
                  options={CONNECTION_OPTIONS}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  A preference for your applicant desk, not a filter — anyone can still ask.
                </p>
              </Fold>

              <Fold
                label="Before someone can ask"
                value={
                  requiredOfGuests.length === 0
                    ? "Anyone can ask"
                    : profileSteps({})
                      .filter((s) => requiredOfGuests.includes(s.key))
                      .map((s) => s.label)
                      .join(", ")
                }
              >
                <p className="text-sm text-muted-foreground">
                  Everyone already needs an age, a city and their vibe. Ask for more and
                  fewer people apply — but you can actually judge the ones who do.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profileSteps({})
                    .filter((s) => HOST_REQUIRABLE.includes(s.key))
                    .map((s) => (
                      <Chip
                        key={s.key}
                        active={requiredOfGuests.includes(s.key)}
                        title={s.payoff}
                        onClick={() =>
                          setRequiredOfGuests((keys) =>
                            keys.includes(s.key)
                              ? keys.filter((k) => k !== s.key)
                              : [...keys, s.key],
                          )
                        }
                      >
                        {s.label}
                      </Chip>
                    ))}
                </div>
              </Fold>

              <Fold
                label="Questions you ask them"
                value={
                  rsvpQuestions.length === 0
                    ? "None"
                    : `${rsvpQuestions.length} of ${MAX_RSVP_QUESTIONS}`
                }
              >
                <p className="text-sm text-muted-foreground">
                  Answers land in your applicant desk. Every extra question loses you a
                  few replies, so only ask what changes your mind.
                </p>
                {Object.entries(
                  RSVP_QUESTIONS.reduce<Record<string, typeof RSVP_QUESTIONS>>((acc, q) => {
                    (acc[q.group] ??= []).push(q);
                    return acc;
                  }, {}),
                ).map(([group, questions]) => (
                  <div key={group} className="mt-4">
                    <p className="font-mono text-xs font-bold uppercase text-muted-foreground">
                      {group}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {questions.map((q) => {
                        const on = rsvpQuestions.includes(q.id);
                        const full = rsvpQuestions.length >= MAX_RSVP_QUESTIONS;
                        return (
                          <Chip
                            key={q.id}
                            active={on}
                            disabled={!on && full}
                            title={q.payoff}
                            onClick={() =>
                              setRsvpQuestions((ids) =>
                                ids.includes(q.id)
                                  ? ids.filter((i) => i !== q.id)
                                  : ids.length >= MAX_RSVP_QUESTIONS
                                    ? ids
                                    : [...ids, q.id],
                              )
                            }
                          >
                            {q.label}
                          </Chip>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </Fold>

              <Fold label="Phone numbers" value={paid ? "Asked · chip-in" : askPhone ? "Asked" : "Not asked"}>
                <p className="text-sm text-muted-foreground">
                  Handy for directions on the night. Everyone who asks has to give one, and you
                  only see someone&apos;s number once you&apos;ve accepted them.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Chip active={!phoneAsked} disabled={paid} onClick={() => setAskPhone(false)}>
                    Don&apos;t ask
                  </Chip>
                  <Chip active={phoneAsked} onClick={() => setAskPhone(true)}>
                    Ask for their number
                  </Chip>
                </div>
                {paid && (
                  <p className="mt-2 text-xs font-bold text-muted-foreground">
                    Always on with a chip-in, so you can reach people about payment.
                  </p>
                )}
              </Fold>

              <Fold label="House rules" value={houseRules.trim() ? "Written" : "None"}>
                <p className="text-sm text-muted-foreground">
                  Write these and every guest has to tick a box before they can ask to
                  come. Leave it blank and there&apos;s no box.
                </p>
                <textarea
                  value={houseRules}
                  maxLength={1000}
                  rows={3}
                  onChange={(e) => setHouseRules(e.target.value)}
                  placeholder="No uninvited plus-ones. Keep it down after 11 — thin walls. If I ask you to leave, please just go."
                  className="mt-3 w-full rounded-sm border-2 border-foreground bg-background p-3 text-sm outline-none focus:shadow-stamp-sm"
                />
              </Fold>

              <Fold label="Age range" value={agesValid ? `${ageMin}–${ageMax}` : "Check this"} alert={!agesValid}>
                <p className="text-sm text-muted-foreground">
                  A target, not a filter — nobody is auto-declined for being outside it.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    min={18}
                    max={40}
                    value={ageMinText}
                    onChange={(e) => setAgeMin(e.target.value)}
                    aria-label="Minimum age"
                    className="w-20 rounded-sm border-2 border-foreground bg-background p-2 outline-none focus:shadow-stamp-sm"
                  />
                  <span className="font-bold">to</span>
                  <input
                    type="number"
                    min={18}
                    max={40}
                    value={ageMaxText}
                    onChange={(e) => setAgeMax(e.target.value)}
                    aria-label="Maximum age"
                    className="w-20 rounded-sm border-2 border-foreground bg-background p-2 outline-none focus:shadow-stamp-sm"
                  />
                </div>
              </Fold>

              <Fold
                label="Group mix"
                value={`${targetWomen} + ${targetMen} of ${capacity}`}
                alert={mixOverflows}
              >
                <p className="text-sm text-muted-foreground">
                  What you&apos;d like the room to look like. Also a target, never a filter.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <label className="flex items-center gap-2 font-bold">
                    <span aria-hidden>&#9792;</span>
                    <input
                      type="number"
                      min={0}
                      max={Math.max(0, capacity - targetMen)}
                      value={womenText}
                      onChange={(e) => setTargetWomen(e.target.value)}
                      aria-label="Target women"
                      className="w-20 rounded-sm border-2 border-foreground bg-background p-2 outline-none focus:shadow-stamp-sm"
                    />
                  </label>
                  <label className="flex items-center gap-2 font-bold">
                    <span aria-hidden>&#9794;</span>
                    <input
                      type="number"
                      min={0}
                      max={Math.max(0, capacity - targetWomen)}
                      value={menText}
                      onChange={(e) => setTargetMen(e.target.value)}
                      aria-label="Target men"
                      className="w-20 rounded-sm border-2 border-foreground bg-background p-2 outline-none focus:shadow-stamp-sm"
                    />
                  </label>
                </div>
                {mixOverflows && (
                  <p className="mt-3 font-bold text-primary">
                    That&apos;s {targetWomen + targetMen} people for {capacity} spots.
                  </p>
                )}
              </Fold>
            </section>
          )}

          {status === "error" && (
            <p className="meta-label text-primary">
              Couldn&apos;t create that plan — check the details and try again.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t-2 border-foreground pt-6">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            <Button
              type="submit"
              disabled={step < STEPS.length - 1 ? !stepDone[step] : !canSubmit}
            >
              {step < STEPS.length - 1
                ? `Next: ${STEPS[step + 1]}`
                : status === "saving"
                  ? "Creating…"
                  : "Put it out there"}
              <ChevronRight />
            </Button>
            <button
              type="button"
              onClick={() => previewDialog.current?.showModal()}
              className="inline-flex h-12 items-center gap-2 px-2 font-bold uppercase underline lg:hidden"
            >
              <Eye className="size-4" /> Preview
            </button>
            <p className="w-full text-sm text-muted-foreground">
              {gaps.length
                ? `Still need ${gaps.join(" and ")}.`
                : step === STEPS.length - 1
                  ? "Nothing here is final — you can change all of it after it's live."
                  : "Looking good."}
            </p>
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <Preview plan={preview} />
            <p className="mt-4 text-xs text-muted-foreground">
              <LockKeyhole className="mr-1 inline size-3" />
              Guests see the area, never the address, until you accept them.
            </p>
          </div>
        </aside>
      </div>

      <dialog
        ref={previewDialog}
        onClick={(e) => e.target === previewDialog.current && previewDialog.current.close()}
        className="m-auto w-[calc(100%-2rem)] max-w-sm bg-transparent p-0 backdrop:bg-foreground/60 backdrop:backdrop-blur-sm"
      >
        <div className="paper-card space-y-4 bg-background p-4">
          <Preview plan={preview} />
          <Button onClick={() => previewDialog.current?.close()} variant="outline" className="w-full">
            Back to editing
          </Button>
        </div>
      </dialog>
    </form>
  );
}
