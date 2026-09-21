"use client";

import Link from "next/link";
import { GoogleButton, OrDivider } from "@/components/google-button";
import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { useSound } from "@/lib/use-sound";
import { Field, inputClass } from "@/components/auth-field";
import { Button } from "@/components/ui";
import { AuthLayout } from "@/components/auth-layout";

export function SignInForm({
  next,
  google = false,
  stat,
}: {
  next?: string;
  google?: boolean;
  /** Real activity, passed in from the server. Never invented. */
  stat?: string;
}) {
  const { play } = useSound();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { error } = await signIn.email({ email, password });

    if (error) {
      // Deliberately vague: saying which half was wrong lets someone probe for
      // valid emails.
      setError("That email and password don't match.");
      setBusy(false);
      return;
    }

    // Give the clip a beat to start; the redirect would otherwise cut it off.
    await Promise.race([play("wow"), new Promise((r) => setTimeout(r, 300))]);
    // See sign-up-form: push + refresh races and renders a blank page.
    window.location.href = next ?? "/discover";
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      headline={
        <>
          The door&apos;s
          <br />
          still open.
        </>
      }
      blurb="Your plans, your crew and the photos from last time are where you left them."
      stat={stat}
    >
      <p className="meta-label text-primary">Sign in</p>
      <h2 className="mt-2 text-4xl uppercase leading-none">Who&apos;s this?</h2>

      <div className="mt-8">
        {google && (
          <>
            <GoogleButton next={next} label="Continue with Google" />
            <OrDivider />
          </>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className={inputClass}
            />
          </Field>

          <Field label="Password">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={inputClass}
            />
          </Field>

          {error && (
            <p className="border-2 border-foreground bg-primary/15 p-3 text-sm font-bold">
              {error}
            </p>
          )}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Checking…" : "Let me in"}
          </Button>
        </form>
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        No account yet?{" "}
        <Link href="/sign-up" className="border-b-2 border-foreground font-bold text-foreground">
          Make one
        </Link>
      </p>
    </AuthLayout>
  );
}
