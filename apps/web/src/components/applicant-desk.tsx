"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ShieldCheck, UserMinus, UsersRound, X } from "lucide-react";
import { confirmChipIn, decideApplication, type ApplicantQueue } from "@/lib/api";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Avatar } from "@/components/person-card";
import { SocialBadge } from "@/components/social-badge";
import { Button, Pill } from "@/components/ui";
import { useSound } from "@/lib/use-sound";

const BUCKETS = [
  { key: "best", label: "Best matches" },
  { key: "good", label: "Good fit" },
  { key: "new", label: "New people" },
  { key: "later", label: "Review later" },
  // Accepted people used to vanish from the desk, taking their number and
  // the chip-in with them. They live here now.
  { key: "going", label: "Going" },
] as const;

type Queued = ApplicantQueue["applications"][number];

/** Where a guest's chip-in stands, from both sides' taps. */
function paymentState(a: Queued) {
  if (a.paidConfirmedAt) return { label: "Paid ✓", tone: "green" as const };
  if (a.paidClaimedAt) return { label: "Says paid", tone: "orange" as const };
  return { label: "Not paid", tone: "muted" as const };
}

const BRINGING_LABEL = {
  SOLO: "Coming solo",
  ONE_FRIEND: "Bringing one friend",
  GROUP: "Bringing a group",
};

export function ApplicantDesk({ queue }: { queue: ApplicantQueue }) {
  const router = useRouter();
  const pending = queue.applications.filter((a) => a.status === "PENDING" || a.status === "REVIEW_LATER");
  const going = queue.applications.filter((a) => a.status === "ACCEPTED");
  const chipIn = queue.plan.chipIn;
  const [removing, setRemoving] = useState(false);

  const [bucket, setBucket] = useState<(typeof BUCKETS)[number]["key"]>("best");
  const [selectedId, setSelectedId] = useState<string | null>(pending[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [justDecided, setJustDecided] = useState<string | null>(null);
  const { play } = useSound();

  const counts = Object.fromEntries(
    BUCKETS.map((b) => [b.key, b.key === "going" ? going.length : pending.filter((a) => a.bucket === b.key).length])
  );
  const isGoing = bucket === "going";
  const listed = isGoing ? going : pending.filter((a) => a.bucket === bucket);
  const pool = isGoing ? going : pending;
  const selected = pool.find((a) => a.id === selectedId) ?? listed[0] ?? (isGoing ? undefined : pending[0]);

  async function markPaid(paid: boolean) {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await confirmChipIn(selected.id, paid);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await decideApplication(selected.id, "PASSED");
      setRemoving(false);
      setSelectedId(going.find((a) => a.id !== selected.id)?.id ?? null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

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
                {isGoing && chipIn ? (
                  <div className="mt-2">
                    <Pill tone={paymentState(a).tone}>{paymentState(a).label}</Pill>
                  </div>
                ) : null}
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
            <h2 className="text-3xl uppercase">{isGoing ? "Nobody's in yet." : "You're all caught up."}</h2>
            <p className="mt-2 text-muted-foreground">
              {isGoing ? "Accept someone and they'll show up here, with their number." : "Every request has an answer. Nice work."}
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

            {selected.phoneGiven && (
              <p className="mt-6 border-2 border-foreground bg-muted p-3 text-sm">
                {selected.phone ? (
                  <>
                    <span className="font-bold">Phone · </span>
                    <a href={`tel:${selected.phone}`} className="font-mono font-bold underline">
                      {selected.phone}
                    </a>
                  </>
                ) : (
                  <span className="font-bold">📞 Gave a number — you&apos;ll see it once you accept.</span>
                )}
              </p>
            )}

            {selected.note && (
              <div className="paper-card mt-6 p-4">
                <p className="meta-label text-primary">What they said</p>
                <p className="mt-2 italic">“{selected.note}”</p>
              </div>
            )}

            {selected.answers && selected.answers.length > 0 && (
              <div className="paper-card mt-6 p-4">
                <p className="meta-label text-primary">What you asked</p>
                <dl className="mt-3 space-y-3">
                  {selected.answers.map((a) => (
                    <div key={a.id}>
                      <dt className="font-mono text-xs font-bold uppercase text-muted-foreground">
                        {a.label}
                      </dt>
                      <dd className="mt-0.5 font-bold">{a.value}</dd>
                    </div>
                  ))}
                </dl>
                {selected.agreedAt && (
                  <p className="mt-4 font-mono text-xs font-bold uppercase text-accent">
                    ✓ Agreed to your house rules
                  </p>
                )}
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

        {/* Someone already in: their chip-in, and the way to take back a yes. */}
        {selected?.status === "ACCEPTED" && (
          <div className="flex shrink-0 flex-wrap items-center gap-3 border-t-2 border-foreground bg-background p-4 lg:p-5">
            {chipIn ? (
              <>
                <Pill tone={paymentState(selected).tone}>
                  ₹{chipIn.toLocaleString("en-IN")} · {paymentState(selected).label}
                </Pill>
                {selected.paidConfirmedAt ? (
                  <Button variant="outline" size="sm" onClick={() => void markPaid(false)} disabled={busy}>
                    Undo paid
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => void markPaid(true)} disabled={busy}>
                    <Check /> Mark as paid
                  </Button>
                )}
              </>
            ) : (
              <p className="text-sm font-bold">They&apos;re in ✓</p>
            )}
            <Button variant="outline" size="sm" onClick={() => setRemoving(true)} disabled={busy} className="ml-auto">
              <UserMinus /> Remove from plan
            </Button>
          </div>
        )}

        <ConfirmDialog
          open={removing}
          onClose={() => setRemoving(false)}
          onConfirm={() => void remove()}
          title={`Remove ${selected?.applicant.name.split(" ")[0] ?? "them"}?`}
          confirmLabel="Remove"
          danger
          busy={busy}
        >
          {chipIn && selected && !selected.paidConfirmedAt
            ? `Their chip-in isn't marked as paid${selected.paidClaimedAt ? " — though they say they've sent it, so check your UPI app first" : ""}. `
            : ""}
          They lose the party room and the address, their spot opens up, and they&apos;re told
          they&apos;re off the list.
        </ConfirmDialog>

        {/* Pinned: the verdict shouldn't scroll away while you read. */}
        {selected && selected.status !== "ACCEPTED" && (
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

        {chipIn && going.length > 0 ? (
          <button
            type="button"
            onClick={() => setBucket("going")}
            className="mt-6 w-full border-2 border-foreground bg-card p-4 text-left"
          >
            <p className="meta-label text-primary">Chip-ins · ₹{chipIn.toLocaleString("en-IN")} each</p>
            <p className="mt-1 font-display text-2xl">
              {going.filter((a) => a.paidConfirmedAt).length} / {going.length} paid
            </p>
            {going.some((a) => a.paidClaimedAt && !a.paidConfirmedAt) && (
              <p className="mt-1 text-sm font-bold text-primary">
                {going.filter((a) => a.paidClaimedAt && !a.paidConfirmedAt).length} say they&apos;ve paid — check and confirm
              </p>
            )}
          </button>
        ) : null}

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
