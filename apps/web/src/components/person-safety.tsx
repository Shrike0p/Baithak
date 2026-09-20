"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, UserX } from "lucide-react";

const REASONS = [
  { value: "HARASSMENT", label: "Harassment" },
  { value: "FAKE_PROFILE", label: "This doesn't seem like a real person" },
  { value: "UNSAFE_BEHAVIOUR", label: "Something unsafe" },
  { value: "SPAM", label: "Spam or advertising" },
  { value: "SOMETHING_ELSE", label: "Something else" },
];

/** Blocking and reporting a person, from their own profile. */
export function PersonSafety({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0].value);
  const [detail, setDetail] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"blocked" | "reported" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function block() {
    if (!window.confirm(`Block ${name}? They're never told, and you'll both disappear from each other's plans and people.`)) return;
    setBusy(true);
    const res = await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setBusy(false);
    if (!res.ok) return setError("that didn't work");
    setDone("blocked");
    router.refresh();
  }

  async function report() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId: userId, reason, detail, alsoBlock }),
    });
    setBusy(false);
    if (!res.ok) return setError("that didn't work");
    setDone("reported");
    setOpen(false);
    router.refresh();
  }

  if (done === "blocked") {
    return <p className="font-bold text-accent">{name} is blocked. You can undo this in Settings.</p>;
  }
  if (done === "reported") {
    return (
      <p className="font-bold text-accent">
        Reported. A human reads these — thank you for telling us.
      </p>
    );
  }

  const link =
    "inline-flex items-center gap-2 font-mono text-xs font-bold uppercase text-muted-foreground hover:text-foreground";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-5">
        <button type="button" disabled={busy} onClick={() => void block()} className={link}>
          <UserX className="size-3.5" /> Block {name}
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} className={link}>
          <Flag className="size-3.5" /> Report
        </button>
      </div>

      {open && (
        <div className="max-w-xl space-y-3 border-2 border-foreground bg-card p-4">
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

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={alsoBlock}
              onChange={(e) => setAlsoBlock(e.target.checked)}
            />
            Also block them — they&apos;re never told.
          </label>

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
