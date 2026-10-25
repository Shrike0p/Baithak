"use client";

import { useCallback, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useDismiss } from "@/lib/use-dismiss";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 15, 30, 45];
/** Where a new pick starts — most plans on here are evenings. */
const DEFAULT_HOUR = 20;

const cell = (on: boolean) =>
  `grid place-items-center rounded-sm border-2 text-xs font-bold transition-transform active:translate-x-px active:translate-y-px ${
    on ? "border-foreground bg-primary text-primary-foreground shadow-stamp-sm" : "border-transparent hover:border-foreground"
  }`;

/**
 * A datetime-local replacement in the flyer style — month grid plus hour,
 * minute and AM/PM chips. Speaks the same "YYYY-MM-DDTHH:mm" local string the
 * native input did, so nothing downstream changed.
 *
 * Opens above the field: below it, the panel ran off the bottom of the screen
 * whenever the field sat low on the page. If the page is scrolled so far that
 * the top would clip, it scrolls just enough to show the whole panel.
 */
export function DateTimePicker({
  value,
  onChange,
  min,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Earliest allowed, same format. Empty = no floor (before hydration). */
  min: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(root, open, close);

  function toggle() {
    if (open) return close();
    setOpen(true);
    requestAnimationFrame(() => panel.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  }

  const date = value.slice(0, 10);
  const hour24 = value ? Number(value.slice(11, 13)) : DEFAULT_HOUR;
  const minute = value ? Number(value.slice(14, 16)) : 0;
  const pm = hour24 >= 12;
  const hour12 = hour24 % 12 || 12;

  const [view, setView] = useState(() => {
    const d = value ? new Date(`${date}T00:00`) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const minDate = min.slice(0, 10);
  const todayKey = ymd(new Date());
  const tooEarly = Boolean(value && min && value < min);

  function set(next: { date?: string; hour24?: number; minute?: number }) {
    const d = next.date ?? (date || todayKey);
    onChange(`${d}T${pad(next.hour24 ?? hour24)}:${pad(next.minute ?? minute)}`);
  }

  // Monday-first grid: blanks up to the 1st, then the month's days.
  const lead = (view.getDay() + 6) % 7;
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(view.getFullYear(), view.getMonth(), i + 1));
  const canGoBack = !minDate || ymd(new Date(view.getFullYear(), view.getMonth(), 0)) >= minDate;

  const label = value
    ? new Date(value).toLocaleString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Pick a day and time";

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
        className={`flex w-full items-center gap-3 rounded-sm border-2 border-foreground bg-background p-3 text-left font-bold transition-shadow ${
          open ? "shadow-stamp-sm" : "hover:bg-muted"
        } ${value ? "" : "text-muted-foreground"}`}
      >
        <CalendarDays className="size-4 shrink-0 text-primary" />
        <span className="min-w-0 truncate">{label}</span>
      </button>
      {tooEarly && <p className="mt-2 text-sm font-bold text-primary">That time has already passed.</p>}

      {open && (
        <div
          ref={panel}
          role="dialog"
          aria-label="Pick a day and time"
          className="paper-card absolute bottom-full left-0 z-30 mb-2 w-[min(18rem,calc(100vw-2.5rem))] scroll-my-20 p-3"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={!canGoBack}
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
              aria-label="Previous month"
              className="grid size-7 place-items-center border-2 border-foreground bg-background shadow-stamp-sm disabled:opacity-30"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <p className="font-display text-base uppercase">
              {view.toLocaleString("en-IN", { month: "long", year: "numeric" })}
            </p>
            <button
              type="button"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
              aria-label="Next month"
              className="grid size-7 place-items-center border-2 border-foreground bg-background shadow-stamp-sm"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((d) => (
              <span key={d} className="meta-label py-0.5 text-[10px] text-muted-foreground">
                {d}
              </span>
            ))}
            {Array.from({ length: lead }, (_, i) => (
              <span key={`b${i}`} />
            ))}
            {days.map((d) => {
              const key = ymd(d);
              const past = Boolean(minDate) && key < minDate;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={past}
                  onClick={() => set({ date: key })}
                  aria-pressed={key === date}
                  aria-label={d.toDateString()}
                  className={`${cell(key === date)} h-8 disabled:cursor-not-allowed disabled:opacity-25 ${
                    key === todayKey && key !== date ? "border-dashed border-foreground/50" : ""
                  }`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 border-t-2 border-foreground pt-3">
            <p className="meta-label text-muted-foreground">Time</p>
            <div className="mt-1.5 grid grid-cols-6 gap-0.5">
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => set({ hour24: (h % 12) + (pm ? 12 : 0) })}
                  aria-pressed={h === hour12}
                  className={`${cell(Boolean(value) && h === hour12)} h-7`}
                >
                  {h}
                </button>
              ))}
            </div>
            <div className="mt-1.5 flex gap-0.5">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set({ minute: m })}
                  aria-pressed={m === minute}
                  className={`${cell(Boolean(value) && m === minute)} h-7 flex-1`}
                >
                  :{pad(m)}
                </button>
              ))}
              <span className="w-1.5" />
              {(["AM", "PM"] as const).map((p) => {
                const on = (p === "PM") === pm;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set({ hour24: (hour24 % 12) + (p === "PM" ? 12 : 0) })}
                    aria-pressed={on}
                    className={`${cell(Boolean(value) && on)} h-7 flex-1`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={close}
            disabled={!value || tooEarly}
            className="mt-3 h-9 w-full border-2 border-foreground bg-foreground text-sm font-bold uppercase text-background shadow-stamp-sm disabled:opacity-40"
          >
            {tooEarly ? "Pick a later time" : value ? "Done" : "Pick a day"}
          </button>
        </div>
      )}
    </div>
  );
}
