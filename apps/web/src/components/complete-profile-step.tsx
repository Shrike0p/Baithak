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
export function CompleteProfileStep({
  missing,
  onDone,
}: {
  missing: string[];
  onDone: () => void;
}) {
  const needsBasics = missing.includes("basics");
  const needsVibe = missing.includes("vibe");

  const [age, setAge] = useState("");
  const [city, setCity] = useState("Bangalore");
  const [vibeTags, setVibeTags] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [prompt] = useState(() => BIO_PROMPTS[Math.floor(Math.random() * BIO_PROMPTS.length)]);
  const [busy, setBusy] = useState(false);

  const toggle = (v: string) =>
    setVibeTags((t) => (t.includes(v) ? t.filter((x) => x !== v) : [...t, v]));

  const ready =
    (!needsBasics || (Number(age) >= 18 && city.trim())) &&
    (!needsVibe || vibeTags.length >= 2);

  async function save() {
    setBusy(true);
    await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(needsBasics ? { age: Number(age), city: city.trim() } : {}),
        ...(needsVibe ? { vibeTags } : {}),
        ...(bio.trim() ? { bio: bio.trim() } : {}),
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

      {needsBasics && (
        <div className="flex gap-3">
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
          <label className="flex flex-[2] flex-col gap-2">
            <span className="meta-label text-muted-foreground">City</span>
            <input
              value={city}
              maxLength={60}
              onChange={(e) => setCity(e.target.value)}
              className="rounded-sm border-2 border-foreground bg-background p-2.5 outline-none focus:shadow-stamp-sm"
            />
          </label>
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

      <div>
        <p className="meta-label text-muted-foreground">{prompt}</p>
        <input
          value={bio}
          maxLength={60}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Optional, but it helps a lot"
          className="mt-2 w-full rounded-sm border-2 border-foreground bg-background p-2.5 text-sm outline-none focus:shadow-stamp-sm"
        />
      </div>

      <Button onClick={save} disabled={!ready || busy} className="w-full">
        {busy ? "Saving…" : "Save and continue"}
      </Button>
    </div>
  );
}
