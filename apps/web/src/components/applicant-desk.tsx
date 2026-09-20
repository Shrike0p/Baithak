"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ShieldCheck, UsersRound, X } from "lucide-react";
import { decideApplication, type ApplicantQueue } from "@/lib/api";
import { Avatar } from "@/components/person-card";
import { SocialBadge } from "@/components/social-badge";
import { Button, Pill } from "@/components/ui";
import { useSound } from "@/lib/use-sound";

const BUCKETS = [
  { key: "best", label: "Best matches" },
  { key: "good", label: "Good fit" },
  { key: "new", label: "New people" },
  { key: "later", label: "Review later" },
] as const;

const BRINGING_LABEL = {
  SOLO: "Coming solo",
  ONE_FRIEND: "Bringing one friend",
  GROUP: "Bringing a group",
};

export function ApplicantDesk({ queue }: { queue: ApplicantQueue }) {
  const router = useRouter();
  const pending = queue.applications.filter((a) => a.status === "PENDING" || a.status === "REVIEW_LATER");

  const [bucket, setBucket] = useState<(typeof BUCKETS)[number]["key"]>("best");
  const [selectedId, setSelectedId] = useState<string | null>(pending[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [justDecided, setJustDecided] = useState<string | null>(null);
  const { play } = useSound();

  const counts = Object.fromEntries(
    BUCKETS.map((b) => [b.key, pending.filter((a) => a.bucket === b.key).length])
  );
  const listed = pending.filter((a) => a.bucket === bucket);
  const selected = pending.find((a) => a.id === selectedId) ?? listed[0] ?? pending[0];

  async function decide(status: "ACCEPTED" | "PASSED" | "REVIEW_LATER") {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await decideApplication(selected.id, status);
      if (status === "ACCEPTED") {
        setJustDecided(selected.applicant.name);
        play("cheer");
      }
      // Passing stays silent on purpose — a sound on rejecting someone reads as
      // judgement, and a host working through a queue would be tortured by it.
      const next = pending.find((a) => a.id !== selected.id);
      setSelectedId(next?.id ?? null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid lg:min-h-0 lg:flex-1 lg:grid-cols-[290px_minmax(380px,1fr)_300px]">
      {/* Left: the queue */}
      <aside className="border-b-2 border-foreground p-4 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r-2">
        {/* Wraps rather than scrolls — in a 290px column a scroll strip hides
            half the piles, and the scrollbar is hidden so nothing hints at it. */}
        <div className="flex flex-wrap gap-2 pb-4">
          {BUCKETS.map((b) => (
            <button
              key={b.key}
              onClick={() => setBucket(b.key)}
              type="button"
              className="shrink-0"
            >
              <Pill tone={bucket === b.key ? "orange" : "plain"}>
                {b.label} · {counts[b.key]}
              </Pill>
            </button>
          ))}
        </div>

        {listed.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nothing in this pile.
          </p>
        ) : (
          <div className="space-y-3">
            {listed.map((a, i) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedId(a.id)}
                className={`w-full border-2 border-foreground p-4 text-left transition-transform hover:-translate-y-0.5 ${
                  selected?.id === a.id
                    ? "bg-secondary text-secondary-foreground shadow-stamp"
                    : "bg-card shadow-stamp-sm"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={a.applicant.name} image={a.applicant.image} index={i} size="sm" />
                  <div className="min-w-0">
                    <h3 className="text-base uppercase">{a.applicant.name}</h3>
                    <p className="meta-label">
                      {a.applicant.age} · {a.applicant.occupation}
                    </p>
                  </div>
                  <span className="ml-auto font-mono text-xs font-bold">
                    ★ {a.applicant.trustScore.toFixed(1)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </aside>

      {/* Centre: the person */}
      <section className="flex flex-col border-b-2 border-foreground lg:min-h-0 lg:border-b-0 lg:border-r-2">
        <div className="flex-1 p-5 lg:min-h-0 lg:overflow-y-auto lg:p-8">
        {!selected ? (
          <div className="py-20 text-center">
            <h2 className="text-3xl uppercase">You&apos;re all caught up.</h2>
            <p className="mt-2 text-muted-foreground">
              Every request has an answer. Nice work.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start gap-5">
              <Avatar name={selected.applicant.name} image={selected.applicant.image} size="lg" />
              <div>
                <Pill tone="green">{BRINGING_LABEL[selected.bringingWith]}</Pill>
                <h2 className="mt-3 text-4xl uppercase">{selected.applicant.name}</h2>
                <p>
                  {[selected.applicant.age, selected.applicant.city, selected.applicant.occupation]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {selected.applicant.social && (
                  <div className="mt-3">
                    <SocialBadge social={selected.applicant.social} />
                  </div>
                )}
              </div>
            </div>

            {selected.applicant.bio && <p className="mt-6">{selected.applicant.bio}</p>}

            {selected.note && (
              <div className="paper-card mt-6 p-4">
                <p className="meta-label text-primary">What they said</p>
                <p className="mt-2 italic">“{selected.note}”</p>
              </div>
            )}

            <div className="mt-8 border-y-2 border-foreground py-6">
              <h3 className="text-xl uppercase">Why they might fit</h3>
              <ul className="mt-4 space-y-2 font-medium">
                {selected.reasons.map((r) => (
                  <li key={r} className="flex gap-3">
                    <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <div className="paper-card p-4">
                <p className="meta-label text-accent">Trust history</p>
                <p className="mt-3 font-display text-3xl">
                  ★ {selected.applicant.trustScore.toFixed(1)}
                </p>
                <p className="mt-2 text-sm">
                  {selected.applicant.plansAttended} attended ·{" "}
                  {selected.applicant.plansHosted} hosted
                </p>
              </div>
              <div className="paper-card p-4">
                <p className="meta-label text-secondary">Their vibe</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selected.applicant.vibeTags.map((v) => (
                    <Pill key={v}>{v}</Pill>
                  ))}
                </div>
              </div>
            </div>

            {justDecided && (
              <div className="animate-stamp mt-8 inline-block -rotate-2 border-4 border-accent px-6 py-3 font-display text-2xl uppercase text-accent">
                {justDecided}&apos;s in ✓
              </div>
            )}
          </>
        )}
        </div>

        {/* Pinned: the verdict shouldn't scroll away while you read. */}
        {selected && (
          <div className="flex shrink-0 flex-wrap gap-3 border-t-2 border-foreground bg-background p-4 lg:p-5">
            <Button variant="outline" onClick={() => decide("PASSED")} disabled={busy}>
              <X /> Pass
            </Button>
            <Button variant="outline" onClick={() => decide("REVIEW_LATER")} disabled={busy}>
              Review later
            </Button>
            <Button onClick={() => decide("ACCEPTED")} disabled={busy} className="ml-auto">
              <Check /> Accept
            </Button>
          </div>
        )}
      </section>

      {/* Right: the room you're building */}
      <aside className="p-5 lg:min-h-0 lg:overflow-y-auto">
        <p className="meta-label text-primary">Your crew</p>
        <h2 className="mt-2 font-display text-4xl">
          {queue.composition.total} / {queue.plan.capacity}
        </h2>

        <div className="mt-6 grid grid-cols-2 gap-2">
          {[
            ["♀", `${queue.composition.women} women`],
            ["♂", `${queue.composition.men} men`],
            ["🆕", `${queue.composition.firstTimers} first-timers`],
            ["↻", `${queue.composition.returning} returning`],
          ].map(([icon, label]) => (
            <div key={label} className="border-2 border-foreground bg-card p-3">
              <strong className="text-xl">{icon}</strong>
              <p className="text-sm">{label}</p>
            </div>
          ))}
        </div>

        {queue.groupHealth.length > 0 && (
          <div className="mt-6 border-2 border-foreground bg-accent p-4">
            <p className="meta-label">Group health</p>
            <ul className="mt-2 space-y-1.5 text-sm font-bold">
              {queue.groupHealth.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <Button href={`/plans/${queue.plan.id}`} variant="outline" size="sm">
            <UsersRound /> See the plan
          </Button>
          <Button href={`/plans/${queue.plan.id}/room`} variant="outline" size="sm">
            <ShieldCheck /> Party room
          </Button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Ranking is a suggestion. Nothing is accepted or declined until you say so.
        </p>
      </aside>
    </div>
  );
}
