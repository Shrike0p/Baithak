import { Check } from "lucide-react";
import type { ProfileStrength } from "@baithak/types";

/**
 * Deliberately not a dating-app completeness ring. Every row says what the
 * missing thing *gets you* rather than scolding you for an empty field, and the
 * 50% mark is meaningful: below it you can't apply at all.
 */
export function ProfileStrengthCard({
  strength,
  className = "",
}: {
  strength: ProfileStrength;
  className?: string;
}) {
  const { percent, steps, canApply, hostView } = strength;

  return (
    <div className={`paper-card p-5 ${className}`}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="meta-label text-primary">Profile strength</p>
          <p className="font-display text-4xl">{percent}%</p>
        </div>
        <p className="meta-label max-w-[55%] text-right text-muted-foreground">
          {percent === 100
            ? "Nothing left — nice"
            : canApply
              ? "Enough to apply. More gets you accepted."
              : "A bit more before you can request to join"}
        </p>
      </div>

      {/* Chunky segmented bar rather than a smooth gradient — matches the flyer
          language, and the notch marks the "can apply" threshold. */}
      <div className="relative mt-4 h-5 border-2 border-foreground bg-background">
        <div
          className={`h-full transition-[width] duration-500 ${canApply ? "bg-accent" : "bg-primary"}`}
          style={{ width: `${percent}%` }}
        />
        <span
          className="absolute inset-y-0 w-0.5 bg-foreground/40"
          style={{ left: "50%" }}
          aria-hidden
        />
      </div>

      {/* The consequence, not the score. "62%" tells you nothing; "most hosts
          will pass" tells you why to bother. */}
      <p
        className={`mt-4 border-2 border-foreground p-3 text-sm font-bold ${
          hostView.tone === "thin"
            ? "bg-primary/15"
            : hostView.tone === "workable"
              ? "bg-muted"
              : "bg-accent/15"
        }`}
      >
        {hostView.message}
      </p>

      <ul className="mt-5 space-y-3">
        {steps.map((step) => (
          <li key={step.key} className="flex gap-3">
            <span
              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-foreground ${
                step.done ? "bg-accent" : "bg-background"
              }`}
            >
              {step.done && <Check className="size-3" />}
            </span>
            <div className="min-w-0">
              <p className={`font-bold ${step.done ? "text-muted-foreground line-through" : ""}`}>
                {step.label}
                {step.required && !step.done && (
                  <span className="ml-2 font-mono text-[11px] uppercase text-primary">
                    needed to apply
                  </span>
                )}
              </p>
              {!step.done && (
                <p className="text-sm text-muted-foreground">{step.payoff}</p>
              )}
            </div>
            <span className="meta-label ml-auto shrink-0 text-muted-foreground">
              +{step.weight}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
