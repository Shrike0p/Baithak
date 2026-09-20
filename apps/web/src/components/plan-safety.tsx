"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, LogOut } from "lucide-react";

const REASONS = [
  { value: "UNSAFE_BEHAVIOUR", label: "Something unsafe" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "FAKE_PROFILE", label: "This doesn't seem real" },
  { value: "SPAM", label: "Spam or advertising" },
  { value: "SOMETHING_ELSE", label: "Something else" },
];

/**
 * Leaving and reporting, on the plan itself.
 *
 * Kept on the plan rather than buried in Settings: the moment someone wants
 * out is the moment they're looking at the thing they want out of.
 */
export function PlanSafety({
  planId,
  hostId,
  isAttending,
  isHost,
}: {
  planId: string;
  hostId: string;
  isAttending: boolean;
  isHost: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0].value);
  const [detail, setDetail] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function leave() {
    if (!window.confirm("Leave this plan? Your seat goes back to the host.")) return;
    setBusy(true);
    const res = await fetch(`/api/plans/${planId}/attendance`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.push("/plans");
    else setError((await res.json().catch(() => ({}))).error ?? "that didn't work");
  }

  async function report() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId,
        // Reporting a plan is usually about the person running it.
        subjectId: alsoBlock ? hostId : undefined,
        reason,
        detail,
        alsoBlock,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "that didn't work");
      return;
    }
    setDone(true);
    setOpen(false);
    router.refresh();
  }

  const link =
    "inline-flex items-center gap-2 font-mono text-xs font-bold uppercase text-muted-foreground hover:text-foreground";

  if (done) {
    return (
      <p className="text-sm font-bold text-accent">
        Reported. A human reads these — thank you for telling us.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4">
        {isAttending && !isHost && (
          <button type="button" onClick={() => void leave()} disabled={busy} className={link}>
            <LogOut className="size-3.5" /> Leave this plan
          </button>
        )}
        <button type="button" onClick={() => setOpen((o) => !o)} className={link}>
          <Flag className="size-3.5" /> Report
        </button>
      </div>

      {open && (
        <div className="space-y-3 border-2 border-foreground bg-card p-4">
          <label className="block">
            <span className="meta-label text-muted-foreground">What&apos;s wrong?</span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2 w-full rounded-sm border-2 border-foreground bg-background p-2"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="meta-label text-muted-foreground">What happened?</span>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              placeholder="Tell us enough that someone can act on it."
              className="mt-2 w-full rounded-sm border-2 border-foreground bg-background p-2"
            />
          </label>

          {!isHost && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={alsoBlock}
                onChange={(e) => setAlsoBlock(e.target.checked)}
              />
              Also block the host — they&apos;re never told.
            </label>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => void report()}
            className="inline-flex h-10 items-center border-2 border-foreground bg-primary px-4 font-bold uppercase text-primary-foreground shadow-stamp-sm disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send report"}
          </button>
        </div>
      )}

      {error && <p className="text-sm font-bold text-primary">{error}</p>}
    </div>
  );
}
