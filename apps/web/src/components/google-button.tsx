"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth-client";

/**
 * One tap in, then straight into onboarding.
 *
 * Google gives us a name, an email and a photo — not an age, a city or a vibe,
 * which is everything a host actually judges. The app layout sends anyone
 * without `onboardedAt` to finish that, so a social sign-up can't skip it.
 */
export function GoogleButton({ next, label }: { next?: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      await signIn.social({
        provider: "google",
        callbackURL: next ?? "/discover",
      });
    } catch {
      setBusy(false);
      setError("Google didn't come back. Try again, or use your email.");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void go()}
        disabled={busy}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-sm border-2 border-foreground bg-background font-bold uppercase shadow-stamp-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
          <path
            fill="#4285F4"
            d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.55-5.17 3.55-8.87Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.26v3.09A12 12 0 0 0 12 24Z"
          />
          <path
            fill="#FBBC05"
            d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.26a12 12 0 0 0 0 10.76l4.01-3.09Z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.62l4.01 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
          />
        </svg>
        {busy ? "Opening Google…" : label}
      </button>
      {error && <p className="meta-label mt-2 text-primary">{error}</p>}
    </div>
  );
}

/** The "or" rule between social and email. */
export function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="h-0.5 flex-1 bg-foreground/20" />
      <span className="meta-label text-muted-foreground">or</span>
      <span className="h-0.5 flex-1 bg-foreground/20" />
    </div>
  );
}
