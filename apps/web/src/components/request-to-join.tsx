"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { applyToPlan } from "@/lib/api";
import { Button } from "@/components/ui";

const BRINGING_OPTIONS = [
  { value: "SOLO", label: "Solo" },
  { value: "ONE_FRIEND", label: "One friend" },
  { value: "GROUP", label: "Group" },
] as const;

type Bringing = (typeof BRINGING_OPTIONS)[number]["value"];

export function RequestToJoin({ planId }: { planId: string }) {
  const [bringingWith, setBringingWith] = useState<Bringing>("SOLO");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      await applyToPlan(planId, { bringingWith, note: note || undefined });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="space-y-5">
        <Button className="w-full" disabled>
          <Check /> Request sent
        </Button>
        <div className="animate-stamp rotate-[-2deg] border-4 border-accent p-4 text-center font-display text-2xl uppercase text-accent">
          Request sent ✓
        </div>
        <p className="meta-label block text-center text-muted-foreground">
          The host will review it
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <p className="meta-label text-muted-foreground">Coming with</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {BRINGING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setBringingWith(opt.value)}
              className={`rounded-sm border-2 border-foreground px-4 py-1.5 text-sm font-bold uppercase transition-transform duration-150 active:translate-x-0.5 active:translate-y-0.5 ${
                bringingWith === opt.value
                  ? "bg-foreground text-background shadow-stamp-sm"
                  : "bg-background hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="meta-label text-muted-foreground">Optional note</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything the host should know?"
          rows={2}
          className="mt-2 w-full rounded-sm border-2 border-foreground bg-background p-3 text-sm outline-none focus:shadow-stamp-sm"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Only information relevant to this plan will be shown to the host.
      </p>

      {status === "error" && (
        <p className="meta-label text-primary">Something went wrong — try again</p>
      )}

      <Button type="submit" disabled={status === "sending"} className="w-full">
        {status === "sending" ? "Sending…" : "Request to join"}
      </Button>
    </form>
  );
}
