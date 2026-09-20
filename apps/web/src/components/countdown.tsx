"use client";

import { useSyncExternalStore } from "react";

function parts(msLeft: number) {
  const s = Math.max(0, Math.floor(msLeft / 1000));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * "Now" as an external store rather than state set from an effect.
 *
 * The clock is genuinely outside React — reading it during render is impure,
 * and seeding it from an effect is a synchronous setState that cascades. The
 * server snapshot is null so the first client render matches the markup, then
 * subscribing swaps in the real time.
 *
 * The cached value is module-level and shared: every countdown on the page
 * wants the same "now", and a fresh Date.now() per getSnapshot call would
 * never compare equal and would re-render forever.
 */
let cachedNow: number | null = null;

function subscribeToClock(onChange: () => void) {
  cachedNow = Date.now();
  const t = setInterval(() => {
    cachedNow = Date.now();
    onChange();
  }, 1000);
  return () => clearInterval(t);
}

export function Countdown({ startsAt }: { startsAt: string }) {
  const target = new Date(startsAt).getTime();
  const now = useSyncExternalStore(
    subscribeToClock,
    () => cachedNow,
    () => null,
  );

  if (now === null) return <p className="font-display text-3xl">--:--:--:--</p>;

  if (target <= now) return <p className="font-display text-3xl">It&apos;s on</p>;

  const { days, hours, minutes, seconds } = parts(target - now);
  return (
    <p className="font-display text-3xl tabular-nums">
      {pad(days)}:{pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </p>
  );
}
