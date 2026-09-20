import type { ReactNode } from "react";

/** Shared by both auth forms so they can't drift apart. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="meta-label text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "h-12 rounded-sm border-2 border-foreground bg-background px-3 outline-none transition-shadow focus:shadow-stamp-sm";
