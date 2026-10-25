"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronRight, X } from "lucide-react";
import type { ProfileStrength } from "@baithak/types";

const DISMISS_KEY = "baithak:profile-nudge-dismissed";

const noop = () => () => {};
function readDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * The strength meter used to live only on /profile and in the account menu —
 * places you visit after you already care. This puts it under the header on
 * every page until the profile is strong, leading with what the next field
 * gets you rather than the bare number.
 *
 * Can't-apply-yet is never dismissible: that one blocks the core action.
 * Otherwise a dismiss lasts the browser session, so it nags at most once a visit.
 */
export function ProfileNudge({ strength }: { strength: ProfileStrength }) {
  // Server snapshot says "dismissed" so a dismissible strip never flashes in
  // before hydration reads the real value.
  const stored = useSyncExternalStore(noop, readDismissed, () => true);
  const [justDismissed, setJustDismissed] = useState(false);
  const dismissed = stored || justDismissed;

  const { percent, canApply, nextUp, hostView } = strength;
  if (hostView.tone === "strong" || !nextUp || (canApply && dismissed)) return null;

  function dismiss() {
    setJustDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  return (
    <div
      className={`flex items-center gap-3 border-b-2 border-foreground px-4 py-2.5 md:px-8 ${
        canApply ? "bg-muted" : "bg-primary/15"
      }`}
    >
      <Link href="/profile" className="group flex min-w-0 flex-1 items-center gap-3">
        <span className="font-display text-xl leading-none">{percent}%</span>
        <span className="relative hidden h-3 w-24 shrink-0 border-2 border-foreground bg-background sm:block">
          <span
            className={`block h-full ${canApply ? "bg-accent" : "bg-primary"}`}
            style={{ width: `${percent}%` }}
          />
        </span>
        <span className="min-w-0 truncate text-sm">
          <span className="font-bold">
            {canApply ? `Add ${nextUp.label.toLowerCase()}` : `Add ${nextUp.label.toLowerCase()} to request to join`}
          </span>
          <span className="hidden text-muted-foreground md:inline"> — {nextUp.payoff}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </Link>
      {canApply && (
        <button type="button" onClick={dismiss} aria-label="Hide for now" className="shrink-0 p-1">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
