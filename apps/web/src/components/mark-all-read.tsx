"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCheck } from "lucide-react";

export function MarkAllRead() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/notifications", { method: "PATCH" });
        setBusy(false);
        router.refresh();
      }}
      className="inline-flex h-10 items-center gap-2 border-2 border-foreground bg-card px-4 font-mono text-xs font-bold uppercase shadow-stamp-sm active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
    >
      <CheckCheck className="size-4" /> Mark all read
    </button>
  );
}
