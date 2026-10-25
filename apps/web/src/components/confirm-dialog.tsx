"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * window.confirm in the flyer style. Native <dialog> for Esc, focus trapping
 * and the top layer. `typeToConfirm` makes the irreversible ones ask for the
 * word itself, so a reflexive tap on "OK" can't destroy anything.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel,
  cancelLabel = "Keep it",
  danger = false,
  typeToConfirm,
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  /** The exact word the person has to type before confirming. */
  typeToConfirm?: string;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const unlocked = !typeToConfirm || typed.trim().toLowerCase() === typeToConfirm.toLowerCase();

  return (
    <dialog
      ref={ref}
      // Esc and backdrop clicks both end up here; the parent owns `open`.
      onClose={() => {
        setTyped("");
        onClose();
      }}
      onClick={(e) => e.target === ref.current && ref.current.close()}
      className="paper-card m-auto w-[calc(100%-2rem)] max-w-md p-0 text-foreground backdrop:bg-foreground/60 backdrop:backdrop-blur-sm"
    >
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          if (unlocked && !busy) onConfirm();
        }}
      >
        <header
          className={`flex items-start justify-between gap-4 border-b-2 border-foreground px-5 py-4 ${
            danger ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
          }`}
        >
          <h2 className="text-2xl uppercase leading-none">{title}</h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center border-2 border-foreground bg-background text-foreground shadow-stamp-sm"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="space-y-4 px-5 py-5">
          {children && <div className="text-sm">{children}</div>}
          {typeToConfirm && (
            <label className="block">
              <span className="text-sm">
                Type <span className="font-mono font-bold">{typeToConfirm}</span> to confirm.
              </span>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoFocus
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className="mt-2 w-full rounded-sm border-2 border-foreground bg-background p-2.5 font-mono outline-none focus:shadow-stamp-sm"
              />
            </label>
          )}
        </div>

        <footer className="flex flex-wrap justify-end gap-3 border-t-2 border-foreground px-5 py-4">
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="inline-flex h-11 items-center border-2 border-foreground bg-background px-5 font-bold uppercase shadow-stamp-sm transition-transform active:translate-x-0.5 active:translate-y-0.5"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={!unlocked || busy}
            className={`inline-flex h-11 items-center border-2 border-foreground px-5 font-bold uppercase shadow-stamp-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-40 ${
              danger ? "bg-primary text-primary-foreground" : "bg-foreground text-background"
            }`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
