"use client";

import { useEffect, useState } from "react";

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

export function Countdown({ startsAt }: { startsAt: string }) {
  const target = new Date(startsAt).getTime();
  const [now, setNow] = useState<number | null>(null);

  // Starts null so server and first client render match, then ticks.
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (now === null) return <p className="font-display text-3xl">--:--:--:--</p>;

  if (target <= now) return <p className="font-display text-3xl">It&apos;s on</p>;

  const { days, hours, minutes, seconds } = parts(target - now);
  return (
    <p className="font-display text-3xl tabular-nums">
      {pad(days)}:{pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </p>
  );
}
