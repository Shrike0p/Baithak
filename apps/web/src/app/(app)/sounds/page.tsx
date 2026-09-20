"use client";

import { useEffect, useState } from "react";
import { useSound } from "@/lib/use-sound";
import { audioStatus } from "@/lib/sounds";
import type { SoundName } from "@/lib/sounds";
import { Button, Pill, PaperCard } from "@/components/ui";

const SOUNDS: { name: SoundName; label: string; where: string }[] = [
  { name: "airhorn", label: "Faaahhhh", where: "Sign up — the one-time arrival (fahhhhh.mp3)" },
  { name: "wow", label: "Anime wow", where: "Sign in" },
  { name: "signOut", label: "Nemesis", where: "Sign out" },
  { name: "stamp", label: "Stamp", where: "Request to join sent" },
  { name: "cheer", label: "Cheer", where: "Host accepts someone · onboarding done" },
  { name: "needleDrop", label: "Needle drop", where: "Unused — synthesised spare" },
  { name: "shutter", label: "Shutter", where: "Photo added to Memories (not wired yet)" },
];

export default function SoundsPage() {
  const { enabled, play, toggle } = useSound();
  const [status, setStatus] = useState<ReturnType<typeof audioStatus> | null>(null);

  // Poll the engine so you can see whether the context woke up and which
  // samples actually decoded — the difference between "blocked" and "broken".
  useEffect(() => {
    const t = setInterval(() => setStatus(audioStatus()), 400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-10 md:px-8">
      <p className="meta-label text-primary">Dev · sound check</p>
      <h1 className="mt-3 text-5xl uppercase md:text-6xl">Does it bang?</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Horn, wow and sign-out are your recordings, trimmed to 2s with a fade; the rest are synthesised in code. Tap to hear them in isolation.
      </p>

      <div className="mt-6">
        <button onClick={toggle}>
          <Pill tone={enabled ? "green" : "plain"}>
            Sound is {enabled ? "on" : "off"} — tap to toggle
          </Pill>
        </button>
      </div>

      {status && (
        <PaperCard className="mt-6 p-4 font-mono text-xs">
          <p>
            audio context: <strong>{status.contextState}</strong>
            {status.contextState !== "running" && " — click anything to wake it"}
          </p>
          <p className="mt-1">decoded: {status.decoded.join(", ") || "none yet"}</p>
          {status.pending.length > 0 && <p className="mt-1">loading: {status.pending.join(", ")}</p>}
        </PaperCard>
      )}

      <div className="mt-8 space-y-4">
        {SOUNDS.map((s) => (
          <PaperCard key={s.name} className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <h2 className="text-2xl uppercase">{s.label}</h2>
              <p className="text-sm text-muted-foreground">{s.where}</p>
            </div>
            <Button onClick={() => play(s.name)} size="sm">
              Play
            </Button>
          </PaperCard>
        ))}
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Tuning lives in apps/web/src/lib/sounds.ts — pitch, length and brightness are all
        plain numbers in there.
      </p>
    </div>
  );
}
