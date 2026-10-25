"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, IndianRupee } from "lucide-react";
import { upiPayLink } from "@baithak/types";
import { claimChipIn, unclaimChipIn } from "@/lib/api";

/**
 * The chip-in, payable. On a phone the button opens GPay / PhonePe / Paytm with
 * the host, amount and plan already filled in; on a laptop there's no UPI app
 * to open, so the ID is right there to copy. Person-to-person — Baithak never
 * sees the money, and can't tell whether it was sent.
 */
export function ChipInPay({
  planId,
  upiId,
  hostName,
  amount,
  planTitle,
  payment,
  compact = false,
}: {
  planId: string;
  upiId: string;
  hostName: string;
  amount: number;
  planTitle: string;
  payment: { paidClaimedAt: string | null; paidConfirmedAt: string | null } | null;
  /** One row of small buttons, for a strip rather than a card. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(Boolean(payment?.paidClaimedAt));
  const host = hostName.split(" ")[0];

  async function claim() {
    setClaiming(true);
    try {
      await claimChipIn(planId);
      setClaimed(true);
      router.refresh();
    } finally {
      setClaiming(false);
    }
  }

  async function unclaim() {
    setClaiming(true);
    try {
      await unclaimChipIn(planId);
      setClaimed(false);
      router.refresh();
    } finally {
      setClaiming(false);
    }
  }

  // Shown once "I've paid" is tapped — with a way back, since it's one tap away from a mis-tap.
  const sentNote = (
    <span className="text-xs">
      <span className="font-bold">✓ Sent</span>
      <span className="text-muted-foreground"> · {host} will confirm · </span>
      <button type="button" onClick={() => void unclaim()} disabled={claiming} className="font-bold underline disabled:opacity-50">
        Undo
      </button>
    </span>
  );

  // Confirmed: nothing left to do, so don't keep showing a Pay button.
  if (payment?.paidConfirmedAt) {
    return (
      <p className="mt-3 border-2 border-accent bg-card p-3 text-sm font-bold text-accent">
        ✓ {host} confirmed your chip-in. You&apos;re all set.
      </p>
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this UPI ID", upiId);
    }
  }

  const payHref = upiPayLink({ upiId, payeeName: hostName, amount, note: `Baithak · ${planTitle}` });
  const small =
    "inline-flex h-8 items-center gap-1.5 border-2 border-foreground px-3 font-mono text-[11px] font-bold uppercase transition-transform active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50";

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {claimed && sentNote}
        <a href={payHref} className={`${small} bg-primary text-primary-foreground shadow-stamp-sm`}>
          <IndianRupee className="size-3" /> Pay
        </a>
        <button type="button" onClick={() => void copy()} title={upiId} className={`${small} bg-background`}>
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy UPI"}
        </button>
        {!claimed && (
          <button type="button" onClick={() => void claim()} disabled={claiming} className={`${small} bg-background`}>
            <Check className="size-3" /> {claiming ? "…" : "I've paid"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <a
        href={payHref}
        className="inline-flex h-11 w-full items-center justify-center gap-2 border-2 border-foreground bg-primary font-bold uppercase text-primary-foreground shadow-stamp-sm transition-transform active:translate-x-0.5 active:translate-y-0.5"
      >
        <IndianRupee className="size-4" /> Pay ₹{amount.toLocaleString("en-IN")} to {hostName.split(" ")[0]}
      </a>
      <button
        type="button"
        onClick={() => void copy()}
        className="flex w-full items-center justify-between gap-2 border-2 border-dashed border-foreground/50 px-3 py-2 text-left"
      >
        <span className="min-w-0 truncate font-mono text-xs">{upiId}</span>
        <span className="flex shrink-0 items-center gap-1 font-mono text-[11px] font-bold uppercase">
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </span>
      </button>
      <p className="text-xs text-muted-foreground">
        The button opens your UPI app on a phone. On a laptop, copy the ID instead.
      </p>
      {/* Baithak can't see a UPI transfer, so the guest says so and the host checks. */}
      {claimed ? (
        <p className="border-2 border-foreground bg-muted p-3">{sentNote}</p>
      ) : (
        <button
          type="button"
          onClick={() => void claim()}
          disabled={claiming}
          className="inline-flex h-11 w-full items-center justify-center gap-2 border-2 border-foreground bg-background font-bold uppercase shadow-stamp-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
        >
          <Check className="size-4" /> {claiming ? "Telling the host…" : "I've paid"}
        </button>
      )}
    </div>
  );
}
