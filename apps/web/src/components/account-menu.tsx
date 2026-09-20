"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronsUpDown, CircleUserRound, LogOut, Settings, Volume2, VolumeX } from "lucide-react";
import type { ProfileStrength } from "@baithak/types";
import { signOut } from "@/lib/auth-client";
import { useSound } from "@/lib/use-sound";
import { Avatar } from "@/components/person-card";

/**
 * The account chip that sits at the bottom of the sidebar. Collapses profile,
 * settings and sign-out into one place rather than three permanent rows, and
 * surfaces profile strength where you'd actually act on it.
 */
export function AccountMenu({
  name,
  email,
  image,
  strength,
}: {
  name: string;
  email: string;
  image?: string | null;
  strength?: ProfileStrength;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const { enabled: soundOn, toggle: toggleSound, play } = useSound();

  // Close on outside click or Escape — a menu you can't dismiss is a trap.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const incomplete = strength && strength.percent < 100;

  return (
    <div ref={ref} className="relative">
      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-full min-w-[230px] border-2 border-foreground bg-card shadow-stamp">
          {strength && (
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="block border-b-2 border-foreground p-4 hover:bg-muted"
            >
              <div className="flex items-baseline justify-between">
                <span className="meta-label text-primary">Profile strength</span>
                <span className="font-display text-xl">{strength.percent}%</span>
              </div>
              <div className="mt-2 h-3 border-2 border-foreground bg-background">
                <div
                  className={`h-full transition-[width] duration-500 ${
                    strength.canApply ? "bg-accent" : "bg-primary"
                  }`}
                  style={{ width: `${strength.percent}%` }}
                />
              </div>
              {incomplete && strength.nextUp && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Next: {strength.nextUp.label.toLowerCase()} · +{strength.nextUp.weight}%
                </p>
              )}
            </Link>
          )}

          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 border-b-2 border-foreground px-4 py-3 font-bold hover:bg-muted"
          >
            <CircleUserRound className="size-5" /> Your profile
          </Link>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 border-b-2 border-foreground px-4 py-3 font-bold hover:bg-muted"
          >
            <Settings className="size-5" /> Settings &amp; safety
          </Link>
          <button
            onClick={toggleSound}
            className="flex w-full items-center gap-3 border-b-2 border-foreground px-4 py-3 text-left font-bold hover:bg-muted"
          >
            {soundOn ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
            {soundOn ? "Sound on" : "Sound off"}
          </button>
          <button
            onClick={() => {
              // Played before the request so it isn't clipped by the redirect —
              // the audio element outlives the component either way.
              play("signOut");
              void signOut({ fetchOptions: { onSuccess: () => router.push("/") } });
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left font-bold hover:bg-muted"
          >
            <LogOut className="size-5" /> Sign out
          </button>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex w-full items-center gap-3 border-2 p-2 text-left transition-colors ${
          open ? "border-foreground bg-card shadow-stamp-sm" : "border-transparent hover:bg-card"
        }`}
      >
        <div className="relative">
          <Avatar name={name} image={image} size="sm" />
          {incomplete && (
            <span
              className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-background bg-primary"
              title="Profile incomplete"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{name}</p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">{email}</p>
        </div>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>
    </div>
  );
}
