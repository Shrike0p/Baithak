"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { HostedPlan } from "@/lib/api";

/**
 * Which plan's queue you're looking at, as a strip of date tickets.
 *
 * The date leads because it's what actually tells a host's plans apart —
 * three "House Party"s are only distinguishable by when. Soonest first, the
 * pending count rides on each ticket, and the strip scrolls sideways so ten
 * plans cost one row, not a wall.
 */
export function HostPlanSwitcher({ plans, selectedId }: { plans: HostedPlan[]; selectedId: string }) {
  const selected = useRef<HTMLAnchorElement>(null);
  const sorted = [...plans].sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  // A deep link to the 9th plan should land with that ticket on screen.
  useEffect(() => {
    selected.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [selectedId]);

  return (
    <nav aria-label="Your plans" className="-mx-5 mt-3 md:-mx-8">
      <div className="flex snap-x gap-2.5 overflow-x-auto px-5 pb-2 pt-2 md:px-8">
        {sorted.map((p) => {
          const on = p.id === selectedId;
          const d = new Date(p.startsAt);
          return (
            <Link
              key={p.id}
              ref={on ? selected : undefined}
              href={`/host?plan=${p.id}`}
              aria-current={on ? "page" : undefined}
              className={`relative flex w-48 shrink-0 snap-start border-2 border-foreground transition-transform hover:-translate-y-0.5 ${
                on ? "bg-primary text-primary-foreground shadow-stamp-sm" : "bg-card"
              }`}
            >
              {p.pendingApplications > 0 && (
                <span
                  className="absolute -right-2 -top-2 grid min-w-5 place-items-center rounded-full border-2 border-foreground bg-secondary px-1 font-mono text-[11px] font-bold leading-4 text-secondary-foreground"
                  aria-label={`${p.pendingApplications} waiting`}
                >
                  {p.pendingApplications}
                </span>
              )}
              {/* Ticket stub: the date, split from the rest by a perforation. */}
              <span className="flex w-12 shrink-0 flex-col items-center justify-center border-r-2 border-dashed border-current/40 py-1.5">
                <span className="font-mono text-[10px] font-bold uppercase leading-none">
                  {d.toLocaleString("en-IN", { month: "short" })}
                </span>
                <span className="font-display text-xl leading-none">{d.getDate()}</span>
                <span className="font-mono text-[10px] font-bold uppercase leading-none">
                  {d.toLocaleString("en-IN", { weekday: "short" })}
                </span>
              </span>
              <span className="min-w-0 flex-1 px-2.5 py-1.5">
                <span className="block truncate text-xs font-bold uppercase leading-tight">{p.title}</span>
                <span className={`mt-0.5 block truncate font-mono text-[10px] ${on ? "opacity-80" : "text-muted-foreground"}`}>
                  {p.neighborhood}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
