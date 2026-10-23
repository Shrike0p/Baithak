"use client";

import { useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { applyToPlan, ApiError } from "@/lib/api";
import { Button } from "@/components/ui";
import { useSound } from "@/lib/use-sound";
import { CompleteProfileStep, type KnownProfile } from "@/components/complete-profile-step";
import { rsvpQuestion } from "@baithak/types";

const BRINGING_OPTIONS = [
  { value: "SOLO", label: "Solo" },
  { value: "ONE_FRIEND", label: "One friend" },
  { value: "GROUP", label: "Group" },
] as const;

type Bringing = (typeof BRINGING_OPTIONS)[number]["value"];

const chip = (on: boolean) =>
  `rounded-sm border-2 border-foreground px-3 py-1.5 text-sm font-bold transition-transform duration-150 active:translate-x-0.5 active:translate-y-0.5 ${
    on ? "bg-foreground text-background shadow-stamp-sm" : "bg-background hover:bg-muted"
  }`;

function Section({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex gap-4">
      <span className="font-mono text-xs font-bold text-primary">{String(n).padStart(2, "0")}</span>
      <div className="min-w-0 flex-1">
        <p className="font-bold uppercase leading-tight">{title}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        <div className="mt-3">{children}</div>
      </div>
    </section>
  );
}

export function RequestToJoin({
  planId,
  planTitle,
  questions = [],
  houseRules,
  profile,
}: {
  planId: string;
  planTitle: string;
  /** Screening question ids this host chose, in their order. */
  questions?: string[];
  houseRules?: string | null;
  /** What we already know, so the profile step never re-asks it. */
  profile?: KnownProfile;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [bringingWith, setBringingWith] = useState<Bringing>("SOLO");
  const [note, setNote] = useState("");
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [missing, setMissing] = useState<string[] | null>(null);
  const { play } = useSound();

  const asked = questions.map(rsvpQuestion).filter((q) => q !== undefined);
  const unanswered = asked.filter((q) => {
    const a = answers[q.id];
    return Array.isArray(a) ? a.length === 0 : !a;
  });
  const blocked = unanswered.length > 0 || (Boolean(houseRules) && !agreed);

  function pick(id: string, value: string, multi: boolean, max: number) {
    setAnswers((prev) => {
      if (!multi) return { ...prev, [id]: value };
      const current = Array.isArray(prev[id]) ? (prev[id] as string[]) : [];
      if (current.includes(value)) return { ...prev, [id]: current.filter((v) => v !== value) };
      // Silently ignoring the tap past the limit reads as broken — drop the
      // oldest instead, so the last thing tapped is always the thing selected.
      return { ...prev, [id]: [...current, value].slice(-max) };
    });
  }

  async function submit() {
    setStatus("sending");
    try {
      await applyToPlan(planId, {
        bringingWith,
        note: note || undefined,
        answers,
        agreed: houseRules ? agreed : undefined,
      });
      setStatus("sent");
      setMissing(null);
      play("stamp");
    } catch (err) {
      // 422 means the profile is too thin for a host to judge — ask for the
      // missing pieces here rather than letting a doomed request through.
      const incomplete = err instanceof ApiError && err.status === 422 && Array.isArray(err.body?.missing);
      if (incomplete) {
        setMissing(err.body?.missing as string[]);
        setStatus("idle");
        return;
      }
      setStatus("error");
    }
  }

  let n = 0;

  return (
    <>
      {status === "sent" ? (
        <div className="space-y-4">
          <div className="animate-stamp border-4 border-accent p-4 text-center font-display text-2xl uppercase text-accent">
            Request sent ✓
          </div>
          <p className="meta-label block text-center text-muted-foreground">The host will review it</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm">
            The host picks the crew.{" "}
            {asked.length > 0 || houseRules
              ? "They've got a couple of questions first."
              : "Tell them who's coming and you're in the queue."}
          </p>
          <Button onClick={() => dialog.current?.showModal()} className="w-full">
            Request to join
          </Button>
        </div>
      )}

      {/* Native <dialog>: Esc, focus trapping and the top layer come free. A
          click on the backdrop lands on the dialog itself, which closes it. */}
      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
        className="paper-card m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-hidden p-0 text-foreground backdrop:bg-foreground/60 backdrop:backdrop-blur-sm"
      >
        <div className="flex max-h-[90dvh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b-2 border-foreground bg-secondary px-6 py-5 text-secondary-foreground">
            <div className="min-w-0">
              <p className="meta-label">Asking in to</p>
              <h2 className="mt-1 truncate text-3xl uppercase leading-none">{planTitle}</h2>
            </div>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Close"
              className="grid size-9 shrink-0 place-items-center border-2 border-foreground bg-background text-foreground shadow-stamp-sm transition-transform active:translate-x-0.5 active:translate-y-0.5"
            >
              <X className="size-4" />
            </button>
          </header>

          {status === "sent" ? (
            <div className="space-y-5 px-6 py-10 text-center">
              <div className="animate-stamp mx-auto inline-block border-4 border-accent px-6 py-3 font-display text-3xl uppercase text-accent">
                Request sent ✓
              </div>
              <p className="text-sm text-muted-foreground">
                The host will look over your profile and answers. You&apos;ll get a notification either way.
              </p>
              <Button onClick={() => dialog.current?.close()} variant="secondary" className="w-full">
                <Check /> Done
              </Button>
            </div>
          ) : missing ? (
            <div className="overflow-y-auto px-6 py-6">
              <CompleteProfileStep missing={missing} known={profile} onDone={submit} />
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
                <Section n={++n} title="Who's coming?">
                  <div className="flex flex-wrap gap-2">
                    {BRINGING_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setBringingWith(opt.value)}
                        className={`${chip(bringingWith === opt.value)} uppercase`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Section>

                {asked.map((q) => {
                  const value = answers[q.id];
                  const multi = q.kind === "multi";
                  return (
                    <Section
                      key={q.id}
                      n={++n}
                      title={q.label}
                      hint={multi ? `Pick up to ${q.maxChoices ?? 2}` : undefined}
                    >
                      {q.kind === "text" ? (
                        <textarea
                          value={typeof value === "string" ? value : ""}
                          maxLength={300}
                          rows={2}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          className="w-full rounded-sm border-2 border-foreground bg-background p-3 text-sm outline-none focus:shadow-stamp-sm"
                        />
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {(q.options ?? []).map((opt) => {
                            const on = Array.isArray(value) ? value.includes(opt) : value === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => pick(q.id, opt, multi, q.maxChoices ?? 2)}
                                className={chip(on)}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </Section>
                  );
                })}

                {houseRules && (
                  <Section n={++n} title="House rules">
                    <div className="border-2 border-foreground bg-muted p-4">
                      <p className="whitespace-pre-line text-sm">{houseRules}</p>
                      <label className="mt-3 flex items-start gap-2 text-sm font-bold">
                        <input
                          type="checkbox"
                          checked={agreed}
                          onChange={(e) => setAgreed(e.target.checked)}
                          className="mt-0.5 accent-primary"
                        />
                        I&apos;ve read these and I&apos;m good with them.
                      </label>
                    </div>
                  </Section>
                )}

                <Section n={++n} title="A note for the host" hint="Optional — but a line about you goes a long way.">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Anything the host should know?"
                    maxLength={300}
                    rows={2}
                    className="w-full rounded-sm border-2 border-foreground bg-background p-3 text-sm outline-none focus:shadow-stamp-sm"
                  />
                </Section>
              </div>

              <footer className="border-t-2 border-foreground bg-card px-6 py-4">
                {status === "error" && (
                  <p className="meta-label mb-3 text-primary">Something went wrong — try again</p>
                )}
                <Button type="submit" disabled={status === "sending" || blocked} className="w-full">
                  {status === "sending"
                    ? "Sending…"
                    : unanswered.length
                      ? `${unanswered.length} left to answer`
                      : blocked
                        ? "Tick the house rules"
                        : "Send my request"}
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Only what&apos;s relevant to this plan is shown to the host.
                </p>
              </footer>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
