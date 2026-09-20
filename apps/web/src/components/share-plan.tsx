"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

/**
 * Hand the link to someone.
 *
 * Uses the native share sheet where there is one — on a phone that's the whole
 * point, since it opens WhatsApp directly. Falls back to copying, which is what
 * desktop wants anyway.
 */
export function SharePlan({ planId, title }: { planId: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/plans/${planId}`;
    const text = `${title} — come to this?`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // Cancelled, or the sheet refused. Copying is a fine second best.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      className="inline-flex h-11 w-full items-center justify-center gap-2 border-2 border-foreground bg-card font-bold uppercase shadow-stamp-sm transition-transform active:translate-x-0.5 active:translate-y-0.5"
    >
      {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
      {copied ? "Link copied" : "Share this plan"}
    </button>
  );
}
