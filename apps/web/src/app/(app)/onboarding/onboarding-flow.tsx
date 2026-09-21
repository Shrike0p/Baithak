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

export function OnboardingFlow({ next }: { next?: string }) {
  const [step, setStep] = useState(1);
  const [picked, setPicked] = useState<string[]>([]);
  const [age, setAge] = useState("");
  const [city, setCity] = useState("Bangalore");
  const [occupation, setOccupation] = useState("");
  const [gender, setGender] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { play } = useSound();

  // Same bar profileStrength() calls required, enforced here so onboarding
  // can't hand back a profile the apply gate immediately rejects.
  const blocked =
    step === 1
      ? picked.length < 1 && "Pick at least one."
      : step === 2
        ? picked.length < 2 && "Pick at least two in total — one more gets you matched."
        : (!(Number(age) >= 18 && Number(age) <= 120) && "Age is needed — hosts set an age range.") ||
          (!city.trim() && "City is needed.");

  const options = step === 1 ? INTERESTS : VIBES;
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
    <div className="mx-auto max-w-4xl px-5 py-12 md:py-16">
      <div className="flex items-center justify-between">
        <p className="meta-label text-primary">Find your people</p>
        <span className="meta-label text-muted-foreground">Step {step} / 3</span>
      </div>

      <h1 className="mt-3 text-5xl uppercase md:text-7xl">
        {step === 1
          ? "What are you here for?"
          : step === 2
            ? "What's your vibe?"
            : "A bit about you"}
      </h1>

      <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
        {step === 3
          ? "This helps us recommend plans and people. It doesn't restrict who you can meet, and you choose what's public later."
          : "Pick as many as you like. There are no wrong answers."}
      </p>

      {step < 3 ? (
        <div className="mt-10 flex flex-wrap gap-3">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              className={`rounded-sm border-2 border-foreground px-5 py-3 font-bold shadow-stamp-sm transition-transform hover:-translate-y-1 active:translate-x-0.5 active:translate-y-0.5 ${
                picked.includes(o) ? "bg-primary text-primary-foreground" : "bg-card"
              }`}
            >
              {picked.includes(o) && <Check className="mr-2 inline size-4" />}
              {o}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <label className="paper-card flex flex-col gap-2 p-5">
            <span className="meta-label text-muted-foreground">Age</span>
            <input
              type="number"
              min={18}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="rounded-sm border-2 border-foreground bg-background p-3 outline-none focus:shadow-stamp-sm"
            />
          </label>

          <label className="paper-card flex flex-col gap-2 p-5">
            <span className="meta-label text-muted-foreground">City</span>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="rounded-sm border-2 border-foreground bg-background p-3 outline-none focus:shadow-stamp-sm"
            />
          </label>

          <label className="paper-card flex flex-col gap-2 p-5">
            <span className="meta-label text-muted-foreground">What do you do?</span>
            <input
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="Designer, chef, student…"
              className="rounded-sm border-2 border-foreground bg-background p-3 outline-none focus:shadow-stamp-sm"
            />
          </label>

          <div className="paper-card p-5">
            <p className="meta-label text-muted-foreground">Gender (optional)</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {GENDERS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGender(gender === g.value ? "" : g.value)}
                >
                  <Pill tone={gender === g.value ? "purple" : "plain"}>{g.label}</Pill>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Only ever shown as part of a plan&apos;s overall mix, never next to your name.
            </p>
          </div>
        </div>
      )}

      {(blocked || error) && (
        <p className="mt-8 border-2 border-foreground bg-primary/15 p-3 text-sm font-bold">
          {error || blocked}
        </p>
      )}

      <div className="mt-12 flex flex-wrap gap-3">
        {step > 1 && (
          <Button variant="outline" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        <Button
          onClick={() => (step < 3 ? setStep(step + 1) : finish())}
          disabled={busy || Boolean(blocked)}
        >
          {step < 3 ? "Keep going" : busy ? "Saving…" : "Show me my people"}
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
