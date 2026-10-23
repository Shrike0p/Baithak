"use client";

import { useState } from "react";
import { BIO_PROMPTS } from "@baithak/types";
import { Button, Pill } from "@/components/ui";

const VIBES = [
  "Chill", "Social", "Loud", "Adventurous", "Music lover",
  "Foodie", "Night owl", "Spontaneous", "Bollywood", "Games",
];

/**
 * Shown inline when someone hits Request to Join without enough profile to be
 * judged. The ask lands at the moment of intent and explains itself — "the host
 * needs to know who they're letting in" — which is a very different thing from
 * a wall in front of browsing.
 */
/** Profile fields we already have — onboarding asked for them once. */
export interface KnownProfile {
  age: number | null;
  city: string | null;
}

export function CompleteProfileStep({
  missing,
  known,
  onDone,
}: {
  missing: string[];
  known?: KnownProfile;
  onDone: () => void;
}) {
  // "basics" is age AND city; only ask for the half that's actually empty.
  const needsAge = missing.includes("basics") && !known?.age;
  const needsCity = missing.includes("basics") && !known?.city?.trim();
  const needsVibe = missing.includes("vibe");
  // A host can demand these three for their own plan, so they have to be
  // fillable right here — otherwise the applicant is told what's missing and
  // given no way to supply it.
  const needsSocial = missing.includes("social");
  const needsOccupation = missing.includes("occupation");
  const needsBio = missing.includes("bio");

  const [age, setAge] = useState("");
  const [city, setCity] = useState("Bangalore");
  const [vibeTags, setVibeTags] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [socialUrl, setSocialUrl] = useState("");
  const [occupation, setOccupation] = useState("");
  const [prompt] = useState(() => BIO_PROMPTS[Math.floor(Math.random() * BIO_PROMPTS.length)]);
  const [busy, setBusy] = useState(false);

  const toggle = (v: string) =>
    setVibeTags((t) => (t.includes(v) ? t.filter((x) => x !== v) : [...t, v]));

  const ready =
    (!needsAge || Number(age) >= 18) &&
    (!needsCity || city.trim()) &&
    (!needsVibe || vibeTags.length >= 2) &&
    (!needsSocial || socialUrl.trim().length > 0) &&
    (!needsOccupation || occupation.trim().length > 0) &&
    (!needsBio || bio.trim().length > 0);

  async function save() {
    setBusy(true);
    await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(needsAge ? { age: Number(age) } : {}),
        ...(needsCity ? { city: city.trim() } : {}),
        ...(needsVibe ? { vibeTags } : {}),
        ...(bio.trim() ? { bio: bio.trim() } : {}),
        ...(socialUrl.trim() ? { socialUrl: socialUrl.trim() } : {}),
        ...(occupation.trim() ? { occupation: occupation.trim() } : {}),
      }),
    });
    setBusy(false);
    onDone();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="meta-label text-primary">One moment</p>
        <p className="mt-1 font-bold">Hosts need to know who they&apos;d be letting in.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Takes about twenty seconds, and you only do it once.
        </p>
      </div>

      {(needsAge || needsCity) && (
        <div className="flex gap-3">
          {needsAge && (
            <label className="flex flex-1 flex-col gap-2">
              <span className="meta-label text-muted-foreground">Age</span>
              <input
                type="number"
                min={18}
                max={40}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="rounded-sm border-2 border-foreground bg-background p-2.5 outline-none focus:shadow-stamp-sm"
              />
            </label>
          )}
          {needsCity && (
            <label className="flex flex-[2] flex-col gap-2">
              <span className="meta-label text-muted-foreground">City</span>
              <input
                value={city}
                maxLength={60}
                onChange={(e) => setCity(e.target.value)}
                className="rounded-sm border-2 border-foreground bg-background p-2.5 outline-none focus:shadow-stamp-sm"
              />
            </label>
          )}
        </div>
      )}

      {needsVibe && (
        <div>
          <p className="meta-label text-muted-foreground">
            Your vibe — pick at least two
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {VIBES.map((v) => (
              <button key={v} type="button" onClick={() => toggle(v)}>
                <Pill tone={vibeTags.includes(v) ? "purple" : "plain"}>{v}</Pill>
              </button>
            ))}
          </div>
        </div>
      )}

      {needsOccupation && (
        <label className="flex flex-col gap-2">
          <span className="meta-label text-muted-foreground">What you do</span>
          <input
            value={occupation}
            maxLength={60}
            onChange={(e) => setOccupation(e.target.value)}
            placeholder="Designer, chef…"
            className="rounded-sm border-2 border-foreground bg-background p-2.5 outline-none focus:shadow-stamp-sm"
          />
        </label>
      )}

      {needsSocial && (
        <label className="flex flex-col gap-2">
          <span className="meta-label text-muted-foreground">One social account</span>
          <input
            value={socialUrl}
            maxLength={120}
            inputMode="url"
            onChange={(e) => setSocialUrl(e.target.value)}
            placeholder="linkedin.com/in/yourname"
            className="rounded-sm border-2 border-foreground bg-background p-2.5 outline-none focus:shadow-stamp-sm"
          />
          <span className="text-xs text-muted-foreground">
            LinkedIn, Instagram or X. This host asks for one before they&apos;ll consider you.
          </span>
        </label>
      )}

      <div>
        <p className="meta-label text-muted-foreground">{prompt}</p>
        <input
          value={bio}
          maxLength={60}
          onChange={(e) => setBio(e.target.value)}
          placeholder={needsBio ? "This host asks for this one" : "Optional, but it helps a lot"}
          className="mt-2 w-full rounded-sm border-2 border-foreground bg-background p-2.5 text-sm outline-none focus:shadow-stamp-sm"
        />
      </div>

      <Button onClick={save} disabled={!ready || busy} className="w-full">
        {busy ? "Saving…" : "Save and continue"}
      </Button>
    </div>
  );
}
