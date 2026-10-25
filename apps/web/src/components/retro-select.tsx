"use client";

import { useCallback, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useDismiss } from "@/lib/use-dismiss";

export interface RetroOption {
  value: string;
  label: string;
  /** One line under the label — what picking this actually means. */
  hint?: string;
}

/**
 * A <select> in the flyer style. The native one can't be styled past its
 * closed state, and its open list is the OS's, which is exactly the part that
 * looked out of place.
 */
export function RetroSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: RetroOption[];
  /** Accessible name for the control. */
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(root, open, close);

  const selected = options.find((o) => o.value === value) ?? options[0];

  function focusOption(delta: number) {
    const items = [...(list.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    items[(i + delta + items.length) % items.length]?.focus();
  }

  function openAndFocus() {
    setOpen(true);
    // After the list renders: land on the current choice, like a native select.
    requestAnimationFrame(() =>
      list.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus(),
    );
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => (open ? close() : openAndFocus())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            openAndFocus();
          }
        }}
        className={`flex w-full items-center justify-between gap-3 rounded-sm border-2 border-foreground bg-background p-3 text-left font-bold transition-shadow ${
          open ? "shadow-stamp-sm" : "hover:bg-muted"
        }`}
      >
        <span className="min-w-0 truncate">{selected?.label}</span>
        <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          ref={list}
          id={id}
          role="listbox"
          aria-label={label}
          onKeyDown={(e) => {
            if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
            e.preventDefault();
            focusOption(e.key === "ArrowDown" ? 1 : -1);
          }}
          className="paper-card absolute inset-x-0 top-full z-30 mt-2 max-h-72 overflow-y-auto p-1.5"
        >
          {options.map((o) => {
            const on = o.value === value;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => {
                    onChange(o.value);
                    close();
                  }}
                  className={`flex w-full items-start gap-3 rounded-sm p-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-foreground ${
                    on ? "bg-primary text-primary-foreground" : "hover:bg-muted focus:bg-muted"
                  }`}
                >
                  <span
                    className={`mt-0.5 grid size-4 shrink-0 place-items-center border-2 ${
                      on ? "border-primary-foreground" : "border-foreground"
                    }`}
                  >
                    {on && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-bold">{o.label}</span>
                    {o.hint && (
                      <span className={`block text-xs ${on ? "opacity-90" : "text-muted-foreground"}`}>{o.hint}</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
