"use client";

import Link from "next/link";
import { GoogleButton, OrDivider } from "@/components/google-button";
import { useState } from "react";
import { signUp } from "@/lib/auth-client";
import { useSound } from "@/lib/use-sound";
import { Button } from "@/components/ui";
import { AuthLayout } from "@/components/auth-layout";
import { Field, inputClass } from "@/components/auth-field";

export function SignUpForm({
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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { error } = await signUp.email({ name: name.trim(), email, password });

    if (error) {
      setError(error.message ?? "Couldn't create that account.");
      setBusy(false);
      return;
    }

    // Once-in-a-lifetime moment for this account, so it gets the full horn.
    // Give the clip a beat to start; the redirect would otherwise cut it off.
    await Promise.race([play("airhorn"), new Promise((r) => setTimeout(r, 300))]);

    // New accounts have no vibe tags yet, so recommendations can't work until
    // they've been through onboarding.
    // A full navigation, not router.push + refresh: the refresh invalidates the
    // router cache while the push's RSC fetch is still in flight, and the page
    // renders blank. A hard load also guarantees the new session cookie is sent.
    window.location.href = next ? `/onboarding?next=${encodeURIComponent(next)}` : "/onboarding";
  }

  return (
    <AuthLayout
      eyebrow="New here"
      headline={
        <>
          You don&apos;t need
          <br />
          a squad.
        </>
      }
      blurb="Find a house party worth going to, see who else is going, and know the host is real before you turn up."
      stat={stat}
    >
      <p className="meta-label text-primary">Make an account</p>
      <h2 className="mt-2 text-4xl uppercase leading-none">Let&apos;s start.</h2>

      <div className="mt-8">
        {google && (
          <>
            <GoogleButton next={next} label="Continue with Google" />
            <OrDivider />
          </>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label="What should we call you?">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="First name is plenty"
              className={inputClass}
            />
          </Field>

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

          <Field label="Password" hint="At least 8 characters.">
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className={inputClass}
            />
          </Field>

          {error && (
            <p className="border-2 border-foreground bg-primary/15 p-3 text-sm font-bold">
              {error}
            </p>
          )}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Creating…" : "Find my people"}
          </Button>
        </form>
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="border-b-2 border-foreground font-bold text-foreground">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
