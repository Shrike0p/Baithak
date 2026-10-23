"use client";

import { useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { applyToPlan, ApiError } from "@/lib/api";
import { Button, Pill } from "@/components/ui";
import { useSound } from "@/lib/use-sound";
import { BIO_PROMPTS, profileStrength, rsvpQuestion, type ProfileInput } from "@baithak/types";

const BRINGING_OPTIONS = [
  { value: "SOLO", label: "Solo" },
  { value: "ONE_FRIEND", label: "One friend" },
  { value: "GROUP", label: "Group" },
] as const;

type Bringing = (typeof BRINGING_OPTIONS)[number]["value"];

const VIBES = [
  "Chill", "Social", "Loud", "Adventurous", "Music lover",
  "Foodie", "Night owl", "Spontaneous", "Bollywood", "Games",
];

const STEP_LABEL: Record<string, string> = {
  basics: "your age and city",
  vibe: "two vibe tags",
  social: "a LinkedIn, Instagram or X link",
  occupation: "what you do",
  bio: "a line about you",
};

const chip = (on: boolean) =>
  `rounded-sm border-2 border-foreground px-3 py-1.5 text-sm font-bold transition-transform duration-150 active:translate-x-0.5 active:translate-y-0.5 ${
    on ? "bg-foreground text-background shadow-stamp-sm" : "bg-background hover:bg-muted"
  }`;
const input =
  "w-full rounded-sm border-2 border-foreground bg-background p-2.5 text-sm outline-none focus:shadow-stamp-sm";

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="meta-label text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function RequestToJoin({
  planId,
  planTitle,
  questions = [],
  houseRules,
  requiredOfGuests = [],
  profile,
}: {
  planId: string;
  planTitle: string;
  /** Screening question ids this host chose, in their order. */
  questions?: string[];
  houseRules?: string | null;
  /** Profile steps this host demands on top of the platform baseline. */
  requiredOfGuests?: string[];
  /** The applicant's profile, so the form asks only for what's actually missing. */
  profile?: ProfileInput;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [bringingWith, setBringingWith] = useState<Bringing>("SOLO");
  const [note, setNote] = useState("");
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const { play } = useSound();

  // The same rule the API's gate runs, so the form shows the whole ask before
  // anyone fills it in — not after, as a 422 that swaps the screen out.
  const [missing, setMissing] = useState<string[]>(() =>
    profile ? profileStrength(profile, requiredOfGuests).missingRequired.map((s) => s.key) : [],
  );
  const [details, setDetails] = useState({
    age: "",
    city: profile?.city?.trim() || "Bangalore",
    vibeTags: profile?.vibeTags ?? [],
    socialUrl: "",
    occupation: "",
    bio: "",
  });
  const set = (patch: Partial<typeof details>) => setDetails((d) => ({ ...d, ...patch }));
  const [prompt] = useState(() => BIO_PROMPTS[Math.floor(Math.random() * BIO_PROMPTS.length)]);
  // "basics" is age AND city; only ask for the half that's actually empty.
  const needsAge = missing.includes("basics") && !profile?.age;
  const needsCity = missing.includes("basics") && !profile?.city?.trim();

  const asked = questions.map(rsvpQuestion).filter((q) => q !== undefined);
  const unanswered = asked.filter((q) => {
    const a = answers[q.id];
    return Array.isArray(a) ? a.length === 0 : !a;
  });
  const profileGaps = [
    needsAge && !(Number(details.age) >= 18 && Number(details.age) <= 120),
    needsCity && !details.city.trim(),
    missing.includes("vibe") && details.vibeTags.length < 2,
    missing.includes("social") && !details.socialUrl.trim(),
    missing.includes("occupation") && !details.occupation.trim(),
    missing.includes("bio") && !details.bio.trim(),
  ].filter(Boolean).length;
  const left = profileGaps + unanswered.length;

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

  async function saveProfile(): Promise<boolean> {
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(needsAge ? { age: Number(details.age) } : {}),
        ...(needsCity ? { city: details.city.trim() } : {}),
        ...(missing.includes("vibe") ? { vibeTags: details.vibeTags } : {}),
        ...(missing.includes("social") ? { socialUrl: details.socialUrl.trim() } : {}),
        ...(missing.includes("occupation") ? { occupation: details.occupation.trim() } : {}),
        ...(missing.includes("bio") ? { bio: details.bio.trim() } : {}),
      }),
    });
    if (!res.ok) {
      setError("Couldn't save your profile. Try again.");
      return false;
    }
    // The API drops what it can't use (an unrecognised link becomes null), so
    // judge what it actually stored rather than what was typed.
    const still = profileStrength(await res.json(), requiredOfGuests).missingRequired.map((s) => s.key);
    if (still.length) {
      setMissing(still);
      setError(`Still need ${still.map((k) => STEP_LABEL[k] ?? k).join(" and ")}.`);
      return false;
    }
    return true;
  }

  async function submit() {
    setStatus("sending");
    setError("");
    try {
      if (missing.length && !(await saveProfile())) {
        setStatus("idle");
        return;
      }
      await applyToPlan(planId, {
        bringingWith,
        note: note || undefined,
        answers,
        agreed: houseRules ? agreed : undefined,
      });
      setMissing([]);
      setStatus("sent");
      play("stamp");
    } catch (err) {
      // Only reachable if our copy of the profile was stale — fold the server's
      // list into the same form rather than switching to a different screen.
      if (err instanceof ApiError && err.status === 422 && Array.isArray(err.body?.missing)) {
        setMissing(err.body.missing as string[]);
        setError(String(err.body?.message ?? "This host needs a bit more about you."));
        setStatus("idle");
        return;
      }
      setError(
        err instanceof ApiError && typeof err.body?.message === "string"
          ? err.body.message
          : "Something went wrong — try again.",
      );
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
            {missing.length
              ? `They'll want ${missing.map((k) => STEP_LABEL[k] ?? k).join(" and ")} — it's all on the next screen.`
              : asked.length > 0 || houseRules
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
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
                {missing.length > 0 && (
                  <Section
                    n={++n}
                    title="About you"
                    hint="Hosts pick from profiles. This saves to yours, so you only do it once."
                  >
                    <div className="space-y-4">
                      {(needsAge || needsCity) && (
                        <div className="flex gap-3">
                          {needsAge && (
                            <div className="flex-1">
                              <Field label="Age">
                                <input
                                  type="number"
                                  min={18}
                                  max={120}
                                  value={details.age}
                                  onChange={(e) => set({ age: e.target.value })}
                                  className={input}
                                />
                              </Field>
                            </div>
                          )}
                          {needsCity && (
                            <div className="flex-2">
                              <Field label="City">
                                <input
                                  value={details.city}
                                  maxLength={60}
                                  onChange={(e) => set({ city: e.target.value })}
                                  className={input}
                                />
                              </Field>
                            </div>
                          )}
                        </div>
                      )}

                      {missing.includes("vibe") && (
                        <div>
                          <p className="meta-label text-muted-foreground">Your vibe — pick at least two</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {VIBES.map((v) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() =>
                                  set({
                                    vibeTags: details.vibeTags.includes(v)
                                      ? details.vibeTags.filter((x) => x !== v)
                                      : [...details.vibeTags, v],
                                  })
                                }
                              >
                                <Pill tone={details.vibeTags.includes(v) ? "purple" : "plain"}>{v}</Pill>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {missing.includes("social") && (
                        <Field label="One social account">
                          <input
                            value={details.socialUrl}
                            maxLength={120}
                            inputMode="url"
                            onChange={(e) => set({ socialUrl: e.target.value })}
                            placeholder="linkedin.com/in/yourname"
                            className={input}
                          />
                          <span className="text-xs text-muted-foreground">
                            LinkedIn, Instagram or X. This host asks for one before they&apos;ll consider you.
                          </span>
                        </Field>
                      )}

                      {missing.includes("occupation") && (
                        <Field label="What you do">
                          <input
                            value={details.occupation}
                            maxLength={60}
                            onChange={(e) => set({ occupation: e.target.value })}
                            placeholder="Designer, chef…"
                            className={input}
                          />
                        </Field>
                      )}

                      {missing.includes("bio") && (
                        <Field label={prompt}>
                          <input
                            value={details.bio}
                            maxLength={60}
                            onChange={(e) => set({ bio: e.target.value })}
                            className={input}
                          />
                        </Field>
                      )}
                    </div>
                  </Section>
                )}

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
                          className={`${input} p-3`}
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
                    className={`${input} p-3`}
                  />
                </Section>
              </div>

              <footer className="border-t-2 border-foreground bg-card px-6 py-4">
                {error && <p className="meta-label mb-3 text-primary">{error}</p>}
                <Button
                  type="submit"
                  disabled={status === "sending" || left > 0 || (Boolean(houseRules) && !agreed)}
                  className="w-full"
                >
                  {status === "sending"
                    ? "Sending…"
                    : left > 0
                      ? `${left} left to fill in`
                      : houseRules && !agreed
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
