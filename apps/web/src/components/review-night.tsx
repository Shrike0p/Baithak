"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import type { PartyRoom, PlanReview } from "@/lib/api";
import { Avatar } from "@/components/person-card";
import { PaperCard } from "@/components/ui";

const AXES = [
  { key: "hostRating", label: "The host", hint: "Did they look after everyone?" },
  { key: "crowdRating", label: "The crowd", hint: "Were these your kind of people?" },
  { key: "vibeRating", label: "The vibe", hint: "Was the night what it promised?" },
  { key: "safetyRating", label: "Felt safe", hint: "Would you have been fine on your own?" },
] as const;

const AGAIN = [
  { value: "YES", label: "Yes" },
  { value: "MAYBE", label: "Maybe" },
  { value: "NO", label: "No" },
] as const;

function Stars({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${label}: ${n} out of 5`}
          aria-pressed={value === n}
          className="transition-transform active:translate-y-0.5"
        >
          <Star
            className={`size-7 ${n <= value ? "fill-primary text-primary" : "text-foreground/25"}`}
          />
        </button>
      ))}
    </div>
  );
}

/**
 * The review, asked at the only moment anyone will answer it — in the room,
 * after the night.
 *
 * Ratings are what finally make `trustScore` real. "Who would you hang out
 * with again" is the other half: it stays private unless the other person
 * picked you too, so nobody learns they weren't chosen.
 */
export function ReviewNight({ room, existing }: { room: PartyRoom; existing: PlanReview | null }) {
  const router = useRouter();
  const [ratings, setRatings] = useState<Record<string, number>>({
    hostRating: existing?.hostRating ?? 0,
    crowdRating: existing?.crowdRating ?? 0,
    vibeRating: existing?.vibeRating ?? 0,
    safetyRating: existing?.safetyRating ?? 0,
  });
  const [attendAgain, setAttendAgain] = useState<string>(existing?.attendAgain ?? "");
  const [picks, setPicks] = useState<string[]>(existing?.hangoutAgain ?? []);
  const [note, setNote] = useState(existing?.privateNote ?? "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const others = room.crew.filter((m) => !m.isYou);
  const complete = AXES.every((a) => ratings[a.key] > 0) && attendAgain !== "";

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/plans/${room.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...ratings, attendAgain, hangoutAgain: picks, privateNote: note }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "that didn't send");
      return;
    }
    const { mutualConnections } = await res.json();
    setDone(mutualConnections ?? 0);
    router.refresh();
  }

  if (done !== null) {
    return (
      <PaperCard className="p-8 text-center">
        <h3 className="text-3xl uppercase">Thanks.</h3>
        <p className="mt-2 text-muted-foreground">
          {done > 0
            ? `${done} of them picked you back — you're connected now.`
            : "Your ratings are counted. Anyone who picks you back becomes a connection."}
        </p>
      </PaperCard>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        {AXES.map((axis) => (
          <div key={axis.key} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold">{axis.label}</p>
              <p className="text-sm text-muted-foreground">{axis.hint}</p>
            </div>
            <Stars
              label={axis.label}
              value={ratings[axis.key]}
              onChange={(n) => setRatings((r) => ({ ...r, [axis.key]: n }))}
            />
          </div>
        ))}
      </div>

      <div>
        <p className="font-bold">Would you go to another night by {room.host.name}?</p>
        <div className="mt-3 flex gap-2">
          {AGAIN.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setAttendAgain(option.value)}
              aria-pressed={attendAgain === option.value}
              className={`h-11 border-2 border-foreground px-5 font-bold uppercase transition-transform active:translate-y-0.5 ${
                attendAgain === option.value
                  ? "bg-primary text-primary-foreground shadow-stamp-sm"
                  : "bg-card"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {others.length > 0 && (
        <div>
          <p className="font-bold">Who would you hang out with again?</p>
          <p className="text-sm text-muted-foreground">
            Private. They only find out if they picked you too.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {others.map((member, i) => {
              const picked = picks.includes(member.user.id);
              return (
                <button
                  key={member.user.id}
                  type="button"
                  onClick={() =>
                    setPicks((p) =>
                      picked ? p.filter((x) => x !== member.user.id) : [...p, member.user.id],
                    )
                  }
                  aria-pressed={picked}
                  className={`flex items-center gap-3 border-2 border-foreground p-3 text-left transition-transform active:translate-y-0.5 ${
                    picked ? "bg-accent/20 shadow-stamp-sm" : "bg-card"
                  }`}
                >
                  <Avatar name={member.user.name} image={member.user.image} index={i} size="sm" />
                  <span className="font-bold">{member.user.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <label className="block">
        <span className="font-bold">Anything we should know?</span>
        <span className="block text-sm text-muted-foreground">
          Never shown to the host or anyone else. This is how you tell us something went wrong.
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-sm border-2 border-foreground bg-background p-3"
        />
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={!complete || busy}
          onClick={() => void submit()}
          className="inline-flex h-12 items-center border-2 border-foreground bg-primary px-6 font-bold uppercase text-primary-foreground shadow-stamp transition-transform active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
        >
          {busy ? "Sending…" : existing ? "Update my review" : "Send review"}
        </button>
        {!complete && (
          <p className="text-sm text-muted-foreground">Rate all four and answer the question.</p>
        )}
        {error && <p className="font-bold text-primary">{error}</p>}
      </div>
    </div>
  );
}
