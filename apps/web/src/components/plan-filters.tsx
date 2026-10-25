"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { PlanSummary } from "@/lib/api";
import { PlanCard } from "@/components/plan-card";
import { PaperCard } from "@/components/ui";
import { useDismiss } from "@/lib/use-dismiss";

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

/** Past this many area chips the row stops being scannable; the rest fold into "+N more". */
const VISIBLE_AREAS = 5;

const chip = (on: boolean, tone = "bg-accent text-accent-foreground") =>
  `inline-flex shrink-0 items-center gap-2 border-2 border-foreground px-4 py-2 font-mono text-xs font-bold uppercase transition-transform active:translate-x-0.5 active:translate-y-0.5 ${
    on ? `${tone} shadow-stamp-sm` : "bg-card hover:bg-muted"
  }`;

function MoreAreas({
  areas,
  counts,
  onPick,
}: {
  areas: string[];
  counts: Record<string, number>;
  onPick: (area: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(root, open, close);

  return (
    <div ref={root} className="relative shrink-0">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={chip(open)}>
        +{areas.length} more <ChevronDown className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="paper-card absolute right-0 top-full z-30 mt-2 max-h-72 w-60 overflow-y-auto p-1.5">
          {areas.map((a) => (
            <li key={a}>
              <button
                type="button"
                onClick={() => {
                  onPick(a);
                  close();
                }}
                className="flex w-full items-center justify-between gap-3 rounded-sm px-3 py-2 text-left font-mono text-xs font-bold uppercase hover:bg-muted"
              >
                <span className="truncate">{a}</span>
                <span className="text-muted-foreground">{counts[a]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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

  // Built from the plans themselves now that any area is allowed, so only
  // areas with something on appear — a row of zeroes reads as a dead app.
  // The busiest few are chips; the rest fold into "+N more" so twenty areas
  // don't become a sideways scroll nobody reads. A picked overflow area is
  // promoted to a chip, so what's filtered stays visible.
  const areaCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of plans) counts[p.neighborhood] = (counts[p.neighborhood] ?? 0) + 1;
    return counts;
  }, [plans]);
  const byBusiest = Object.keys(areaCounts).sort((x, y) => areaCounts[y] - areaCounts[x] || x.localeCompare(y));
  const visible = byBusiest.slice(0, VISIBLE_AREAS);
  if (area !== "all" && !visible.includes(area)) visible.push(area);
  const overflow = byBusiest.filter((a) => !visible.includes(a));

  const shown = inArea.filter((p) => matches(p, active));
  const [first, ...rest] = shown;

  return (
    <div>
      {/* "+N more" sits outside the scrolling row: an overflow-x container
          would clip its dropdown. */}
      <div className="mb-3 flex items-start gap-2">
        <div className="hide-scrollbar flex min-w-0 gap-2 overflow-x-auto pb-1">
          {[{ key: "all", label: "Everywhere" }, ...visible.map((a) => ({ key: a, label: a }))].map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={() => setArea(a.key)}
              aria-pressed={area === a.key}
              className={chip(area === a.key)}
            >
              {a.label}
              {a.key !== "all" && (
                <span className={area === a.key ? "opacity-80" : "text-muted-foreground"}>
                  {areaCounts[a.key] ?? 0}
                </span>
              )}
            </button>
          ))}
        </div>
        {overflow.length > 0 && <MoreAreas areas={overflow} counts={areaCounts} onPick={setArea} />}
      </div>

      <div className="hide-scrollbar mb-8 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setActive(f.key)}
            aria-pressed={active === f.key}
            className={chip(active === f.key, "bg-primary text-primary-foreground")}
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
