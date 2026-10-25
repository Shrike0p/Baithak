"use client";

import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { Button, Pill } from "@/components/ui";
import { useSound } from "@/lib/use-sound";

const INTERESTS = [
  "Meet new people", "Weekend plans", "House parties", "Drinks", "Dinner",
  "Music", "Gaming", "Sports", "Trips", "New to the city",
];

const VIBES = [
  "Chill", "Social", "Loud", "Adventurous", "Introvert-friendly",
  "Music lover", "Foodie", "Night owl", "Spontaneous",
];

const GENDERS = [
  { value: "WOMAN", label: "Woman" },
  { value: "MAN", label: "Man" },
  { value: "NON_BINARY", label: "Non-binary" },
  { value: "PREFER_NOT_TO_SAY", label: "Rather not say" },
];

const STEPS = 2;

const field =
  "w-full rounded-sm border-2 border-foreground bg-background p-3 outline-none focus:shadow-stamp-sm";

function ChipGroup({
  label,
  options,
  picked,
  toggle,
}: {
  label: string;
  options: string[];
  picked: string[];
  toggle: (o: string) => void;
}) {
  return (
    <div>
      <p className="meta-label text-muted-foreground">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2.5">
        {options.map((o) => {
          const on = picked.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              aria-pressed={on}
              className={`relative rounded-sm border-2 border-foreground px-4 py-2.5 font-bold shadow-stamp-sm transition-transform hover:-translate-y-1 active:translate-x-0.5 active:translate-y-0.5 ${
                on ? "bg-primary text-primary-foreground" : "bg-card"
              }`}
            >
              {/* A corner badge, not an inline icon: anything that changes the
                  chip's width reflows the whole wrapped row on every tap. */}
              {on && (
                <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full border-2 border-foreground bg-background text-foreground">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Two screens, not three. Interests and vibe used to be separate pages of the
 * same chip-picking task, which read as "more of this?" — they're one question
 * ("what are you into") and now one screen. Only what profileStrength() needs
 * to let someone apply is mandatory; everything else waits for the profile.
 */
export function OnboardingFlow({ next }: { next?: string }) {
  const [step, setStep] = useState(1);
  const [picked, setPicked] = useState<string[]>([]);
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [occupation, setOccupation] = useState("");
  const [gender, setGender] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { play } = useSound();

  // Same bar profileStrength() calls required, enforced here so onboarding
  // can't hand back a profile the apply gate immediately rejects.
  const blocked =
    step === 1
      ? picked.length < 2 && (picked.length ? "One more and you're matched." : "Pick at least two.")
      : (!(Number(age) >= 18 && Number(age) <= 40) && "Add your age — hosts set an age range.") ||
        (!city.trim() && "Add your city.") ||
        (!gender && "Pick one — it's only used for the group mix, never to filter you.");

  const toggle = (o: string) =>
    setPicked((p) => (p.includes(o) ? p.filter((x) => x !== o) : [...p, o]));

  async function finish() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vibeTags: picked,
        age: Number(age) || undefined,
        city: city.trim(),
        occupation: occupation.trim(),
        gender: gender || undefined,
      }),
    });
    if (!res.ok) {
      setBusy(false);
      setError("Couldn't save that. Try again.");
      return;
    }
    play("cheer");
    // Hard navigation: push + refresh races the in-flight RSC fetch and lands
    // on a blank page. The layout also re-checks onboardedAt on this request.
    window.location.href = next ?? "/discover";
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 md:py-14">
      <div className="flex items-center justify-between">
        <p className="meta-label text-primary">Find your people</p>
        <span className="meta-label text-muted-foreground">
          {step === STEPS ? "Last step" : `Step ${step} of ${STEPS}`}
        </span>
      </div>
      <div className="mt-3 h-2 border-2 border-foreground bg-card">
        <div
          className="h-full bg-primary transition-[width] duration-500"
          style={{ width: `${(step / STEPS) * 100}%` }}
        />
      </div>

      <h1 className="mt-8 text-4xl uppercase leading-none md:text-6xl">
        {step === 1 ? "What are you into?" : "Quick one about you"}
      </h1>
      <p className="mt-4 max-w-2xl text-muted-foreground md:text-lg">
        {step === 1
          ? "Pick a few. This is how we match you to the right plans."
          : "Four fields and you're in. Gender is only ever shown as part of a plan's overall mix."}
      </p>

      {step === 1 ? (
        <div className="mt-8 space-y-7">
          <ChipGroup label="Here for" options={INTERESTS} picked={picked} toggle={toggle} />
          <ChipGroup label="Your vibe" options={VIBES} picked={picked} toggle={toggle} />
        </div>
      ) : (
        <div className="paper-card mt-8 space-y-5 p-5 md:p-6">
          <div className="grid grid-cols-[6rem_1fr] gap-3">
            <label className="flex flex-col gap-2">
              <span className="meta-label text-muted-foreground">Age</span>
              <input
                type="number"
                inputMode="numeric"
                min={18}
                max={40}
                autoFocus
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className={field}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="meta-label text-muted-foreground">City</span>
              <input maxLength={60} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Your city" className={field} />
            </label>
          </div>

          <div>
            <p className="meta-label text-muted-foreground">Gender</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {GENDERS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  aria-pressed={gender === g.value}
                  onClick={() => setGender(gender === g.value ? "" : g.value)}
                >
                  <Pill tone={gender === g.value ? "purple" : "plain"}>{g.label}</Pill>
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-2">
            <span className="meta-label text-muted-foreground">
              What do you do? <span className="normal-case">(optional)</span>
            </span>
            <input
              maxLength={60}
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="Designer, chef, student…"
              className={field}
            />
          </label>
        </div>
      )}

      {/* Keeps its space once satisfied, so the buttons below don't jump. */}
      <p
        className={`mt-6 min-h-5 text-sm font-bold ${error ? "text-primary" : "text-muted-foreground"} ${
          blocked || error ? "" : "invisible"
        }`}
      >
        {error || blocked || " "}
      </p>

      <div className="mt-4 flex gap-3">
        {step > 1 && (
          <Button variant="outline" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        <Button
          onClick={() => (step < STEPS ? setStep(step + 1) : finish())}
          disabled={busy || Boolean(blocked)}
          className="flex-1 md:flex-none"
        >
          {step < STEPS ? "Keep going" : busy ? "Saving…" : "Show me my people"}
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
