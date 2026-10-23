"use client";

import { useMemo, useState } from "react";
import type { PlanSummary } from "@/lib/api";
import { PlanCard } from "@/components/plan-card";
import { PaperCard } from "@/components/ui";
import { LAUNCH_AREAS } from "@baithak/types";

/**
 * When a plan is, as a filter rather than a stack of sections.
 *
 * The sections this replaces were decorative — "Tonight" was the first plan and
 * "This weekend" was all the others, with no date logic at all. These windows
 * are real, and everything sits on one screen instead of below the fold.
 *
 * No "near me": plans carry a free-text neighbourhood, not coordinates, so
 * there's nothing honest to measure distance against.
 */

type Key = "all" | "tonight" | "weekend" | "week";

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Friday evening through Sunday night, of the week we're currently in. */
function weekend() {
  const now = new Date();
  const from = new Date(now);
  // 5 = Friday. If it's already the weekend, the window started behind us.
  from.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7));
  from.setHours(17, 0, 0, 0);
  if (from < now) from.setTime(now.getTime());

  const to = new Date(from);
  to.setDate(from.getDate() + (7 - from.getDay()) % 7);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function matches(plan: PlanSummary, key: Key) {
  const at = new Date(plan.startsAt);
  if (key === "all") return true;
  if (key === "tonight") return at <= endOfToday();
  if (key === "weekend") {
    const { from, to } = weekend();
    return at >= from && at <= to;
  }
  return at.getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000;
}

const FILTERS: { key: Key; label: string }[] = [
  { key: "all", label: "All" },
  { key: "tonight", label: "Tonight" },
  { key: "weekend", label: "This weekend" },
  { key: "week", label: "Next 7 days" },
];

export function PlanFilters({ plans }: { plans: PlanSummary[] }) {
  const [active, setActive] = useState<Key>("all");
  // Area sits alongside the time window rather than replacing it: "this weekend
  // in HSR" is the actual question, and either half alone is the wrong answer.
  const [area, setArea] = useState<string>("all");

  const inArea = useMemo(
    () => (area === "all" ? plans : plans.filter((p) => p.neighborhood === area)),
    [plans, area],
  );

  const counts = useMemo(
    () =>
      Object.fromEntries(
        FILTERS.map((f) => [f.key, inArea.filter((p) => matches(p, f.key)).length]),
      ) as Record<Key, number>,
    [inArea],
  );

  const areaCounts = useMemo(
    () =>
      Object.fromEntries(
        LAUNCH_AREAS.map((a) => [a, plans.filter((p) => p.neighborhood === a).length]),
      ) as Record<string, number>,
    [plans],
  );

  const shown = inArea.filter((p) => matches(p, active));
  const [first, ...rest] = shown;

  return (
    <div>
      <div className="hide-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1">
        {[{ key: "all", label: "Everywhere" }, ...LAUNCH_AREAS.map((a) => ({ key: a, label: a }))].map(
          (a) => (
            <button
              key={a.key}
              type="button"
              onClick={() => setArea(a.key)}
              aria-pressed={area === a.key}
              className={`inline-flex shrink-0 items-center gap-2 border-2 border-foreground px-4 py-2 font-mono text-xs font-bold uppercase transition-transform active:translate-x-0.5 active:translate-y-0.5 ${
                area === a.key
                  ? "bg-accent text-accent-foreground shadow-stamp-sm"
                  : "bg-card hover:bg-muted"
              }`}
            >
              {a.label}
              {a.key !== "all" && (
                <span className={area === a.key ? "opacity-80" : "text-muted-foreground"}>
                  {areaCounts[a.key] ?? 0}
                </span>
              )}
            </button>
          ),
        )}
      </div>

      <div className="hide-scrollbar mb-8 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setActive(f.key)}
            aria-pressed={active === f.key}
            className={`inline-flex shrink-0 items-center gap-2 border-2 border-foreground px-4 py-2 font-mono text-xs font-bold uppercase transition-transform active:translate-x-0.5 active:translate-y-0.5 ${
              active === f.key
                ? "bg-primary text-primary-foreground shadow-stamp-sm"
                : "bg-card hover:bg-muted"
            }`}
          >
            {f.label}
            <span className={active === f.key ? "opacity-80" : "text-muted-foreground"}>
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <PaperCard className="p-12 text-center">
          <h2 className="text-3xl uppercase">
            {area === "all" ? "Nothing in that window." : `Nothing in ${area} yet.`}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {area === "all"
              ? "Try a wider one — or make the plan yourself."
              : "Try everywhere, a wider window — or be the first to host here."}
          </p>
        </PaperCard>
      ) : (
        <div className="space-y-7">
          <PlanCard plan={first} large />
          {rest.length > 0 && (
            <div className="grid gap-7 md:grid-cols-3">
              {rest.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
