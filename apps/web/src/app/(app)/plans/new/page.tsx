"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Check, ChevronRight, Copy, ImagePlus, LockKeyhole, Share2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { createPlan } from "@/lib/api";
import { uploadImage } from "@/lib/upload";
import { COVER_PRESETS } from "@/lib/plan-art";
import { useSound } from "@/lib/use-sound";
import {
  LAUNCH_AREAS,
  profileSteps,
  HOST_REQUIRABLE,
  RSVP_QUESTIONS,
  DEFAULT_RSVP_QUESTIONS,
  MAX_RSVP_QUESTIONS,
} from "@baithak/types";
import { Button, Pill } from "@/components/ui";

const CATEGORIES = [
  { value: "HOUSE_PARTY", label: "House Party" },
  { value: "DRINKS", label: "Drinks" },
  { value: "DINNER", label: "Dinner" },
  { value: "GAME_NIGHT", label: "Game Night" },
  { value: "MOVIE", label: "Screening" },
  { value: "SPORTS", label: "Sports" },
  { value: "TRIP", label: "Trip" },
  { value: "OTHER", label: "Other" },
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
}: {
  planId: string;
  title: string;
  neighborhood: string;
  startsAt: string;
  capacity: number;
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
  const message = `${title} — ${neighborhood}, ${when}. ${capacity} spots.\nAsk to come: ${url}`;

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

const CONNECTION_LABELS = {
  OPEN: "Open to new people",
  FRIENDS_OF_FRIENDS: "Friends of friends",
  COMMUNITY: "Community members",
  INVITE_ONLY: "Invite only",
};

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

export default function MakeAPlanPage() {
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
  const [ageMin, setAgeMin] = useState(23);
  const [ageMax, setAgeMax] = useState(30);
  const [targetWomen, setTargetWomen] = useState(6);
  const [targetMen, setTargetMen] = useState(6);
  const [requiredOfGuests, setRequiredOfGuests] = useState<string[]>([]);
  const [rsvpQuestions, setRsvpQuestions] = useState<string[]>(DEFAULT_RSVP_QUESTIONS);
  const [houseRules, setHouseRules] = useState("");
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

  const toggleVibe = (v: string) =>
    setVibeTags((tags) => (tags.includes(v) ? tags.filter((t) => t !== v) : [...tags, v]));

  // Same rule the API enforces, surfaced before they hit save.
  const mixOverflows = targetWomen + targetMen > capacity;
  const canSubmit =
    title.trim() &&
    neighborhood.trim() &&
    exactAddress.trim() &&
    startsAt &&
    !mixOverflows &&
    status !== "saving";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    try {
      const plan = await createPlan({
        title: title.trim(),
        category,
        startsAt: new Date(startsAt).toISOString(),
        neighborhood: neighborhood.trim(),
        exactAddress: exactAddress.trim(),
        capacity,
        vibeTags,
        imageUrl,
        requiredOfGuests,
        rsvpQuestions,
        houseRules: houseRules.trim() || undefined,
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
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-5xl px-5 pb-24 pt-10 md:px-8">
      <p className="meta-label text-primary">Host mode</p>
      <h1 className="mt-3 text-5xl uppercase md:text-7xl">Make a plan</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Put the idea out there. Keep the address private.
      </p>

      <div className="mt-9 grid gap-6 md:grid-cols-2">
        <Field title="What are you calling it?">
          <input
            value={title}
            maxLength={40}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Saturday House Party"
            className="w-full rounded-sm border-2 border-foreground bg-background p-3 outline-none focus:shadow-stamp-sm"
          />
        </Field>

        <Field title="What are you planning?">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Chip key={c.value} active={category === c.value} onClick={() => setCategory(c.value)}>
                {c.label}
              </Chip>
            ))}
          </div>
        </Field>

        <Field title="When?">
          <input
            type="datetime-local"
            min={minStartsAt}
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full rounded-sm border-2 border-foreground bg-background p-3 outline-none focus:shadow-stamp-sm"
          />
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

        <Field title="Where?">
          <div className="flex flex-wrap gap-2">
            {LAUNCH_AREAS.map((area) => (
              <Chip
                key={area}
                active={neighborhood === area}
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
            {COVER_PRESETS.map((cover) => (
              <button
                key={cover.url}
                type="button"
                onClick={() => setImageUrl(cover.url)}
                aria-pressed={imageUrl === cover.url}
                className={`overflow-hidden rounded-sm border-2 border-foreground transition-transform duration-150 hover:-translate-y-0.5 ${imageUrl === cover.url ? "shadow-stamp" : "opacity-60"
                  }`}
              >
                <Image
                  src={cover.url}
                  alt={cover.label}
                  width={400}
                  height={300}
                  className="aspect-[4/3] w-full object-cover"
                />
                <span className="meta-label block border-t-2 border-foreground bg-background py-1">
                  {cover.label}
                </span>
              </button>
            ))}
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
              <div className="flex items-center gap-3">
                <Image
                  src={coverPreview}
                  alt="Your cover"
                  width={120}
                  height={90}
                  unoptimized
                  className="h-14 w-20 border-2 border-foreground object-cover shadow-stamp-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCoverFile(null);
                    setCoverPreview(null);
                    if (coverInput.current) coverInput.current.value = "";
                  }}
                  className="font-mono text-xs font-bold uppercase text-muted-foreground hover:text-foreground"
                >
                  Remove
                </button>
              </div>
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
              ? "Your photo replaces the preset once the plan is created."
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
      </div>

      <section className="paper-card mt-6">
        <div className="border-b-2 border-foreground p-5">
          <h2 className="text-xl uppercase">Who comes</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            All of this is optional, and all of it can change after the plan is
            live. Open only what you actually care about.
          </p>
        </div>

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
              .filter((step) => HOST_REQUIRABLE.includes(step.key))
              .map((step) => (
                <Chip
                  key={step.key}
                  active={requiredOfGuests.includes(step.key)}
                  title={step.payoff}
                  onClick={() =>
                    setRequiredOfGuests((keys) =>
                      keys.includes(step.key)
                        ? keys.filter((k) => k !== step.key)
                        : [...keys, step.key],
                    )
                  }
                >
                  {step.label}
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

        <Fold label="Age range" value={`${ageMin}–${ageMax}`}>
          <p className="text-sm text-muted-foreground">
            A target, not a filter — nobody is auto-declined for being outside it.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              min={18}
              max={40}
              value={ageMin}
              onChange={(e) => setAgeMin(Number(e.target.value))}
              aria-label="Minimum age"
              className="w-20 rounded-sm border-2 border-foreground bg-background p-2 outline-none focus:shadow-stamp-sm"
            />
            <span className="font-bold">to</span>
            <input
              type="number"
              min={18}
              max={40}
              value={ageMax}
              onChange={(e) => setAgeMax(Number(e.target.value))}
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
                value={targetWomen}
                onChange={(e) => setTargetWomen(Number(e.target.value))}
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
                value={targetMen}
                onChange={(e) => setTargetMen(Number(e.target.value))}
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

        <Fold
          label="Who can request"
          value={
            CONNECTION_LABELS[connectionPreference as keyof typeof CONNECTION_LABELS] ??
            "Open to new people"
          }
        >
          <select
            value={connectionPreference}
            onChange={(e) => setConnectionPreference(e.target.value)}
            aria-label="Connection preference"
            className="w-full rounded-sm border-2 border-foreground bg-background p-2 font-bold outline-none"
          >
            {Object.entries(CONNECTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Fold>
      </section>

      {status === "error" && (
        <p className="meta-label mt-6 text-primary">
          Couldn&apos;t create that plan — check the details and try again.
        </p>
      )}

      <div className="mt-9 flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={!canSubmit}>
          {status === "saving" ? "Creating…" : "Put it out there"}
          <ChevronRight />
        </Button>
        <p className="text-sm text-muted-foreground">
          Nothing here is final — you can change all of it after it&apos;s live.
        </p>
      </div>
    </form>
  );
}
