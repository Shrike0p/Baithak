"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Undo2 } from "lucide-react";
import type { BlockedPerson, Me } from "@/lib/api";
import { Avatar } from "@/components/person-card";
import { PaperCard, SectionTitle } from "@/components/ui";
import { signOut } from "@/lib/auth-client";

/**
 * Safety controls that actually do something, and honest gaps where they
 * don't yet.
 *
 * Deliberately not the full 7-field × 4-level privacy matrix from
 * ARCHITECTURE.md: nothing reads those settings yet, and a toggle that claims
 * to hide your photos while they stay visible is worse than no toggle.
 */
export function SettingsPanel({ me, blocked }: { me: Me; blocked: BlockedPerson[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function unblock(userId: string) {
    setBusy(userId);
    await fetch("/api/blocks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="mt-10 space-y-12">
      <section>
        <SectionTitle kicker="What other people can see" title="Your visibility" />
        <PaperCard className="divide-y-2 divide-foreground/15 p-0">
          {[
            {
              label: "Your name and photo",
              value: "Anyone signed in",
              note: "Signed-out visitors never see guests — only hosts, who are advertising.",
            },
            {
              label: "Your exact address, when hosting",
              value: "Accepted guests only",
              note: "Shared the moment you accept someone, never before.",
            },
            {
              label: "Party photos you upload",
              value: "People who were there",
              note: "Only the host can publish their own photos publicly.",
            },
            {
              label: "Your social link",
              value: me.socialUrl ? "Anyone signed in" : "Not added",
              note: "Hosts weigh this heavily when deciding. Remove it any time from your profile.",
            },
          ].map((row) => (
            <div key={row.label} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 p-5">
              <strong className="min-w-48 flex-1">{row.label}</strong>
              <span className="meta-label text-accent">{row.value}</span>
              <p className="w-full text-sm text-muted-foreground">{row.note}</p>
            </div>
          ))}
        </PaperCard>
        <p className="mt-3 text-sm text-muted-foreground">
          These are fixed for now. Per-field controls arrive when there&apos;s more to control —
          we&apos;d rather show you the real rules than a switch that does nothing.
        </p>
      </section>

      <section>
        <SectionTitle
          kicker={blocked.length ? `${blocked.length} blocked` : "Nobody blocked"}
          title="Blocked people"
        />
        {blocked.length === 0 ? (
          <PaperCard className="p-8">
            <p className="text-muted-foreground">
              Block someone from their profile or an applicant card. They&apos;re never told, and
              you both disappear from each other&apos;s plans and people.
            </p>
          </PaperCard>
        ) : (
          <div className="space-y-3">
            {blocked.map((person, i) => (
              <div
                key={person.id}
                className="flex items-center gap-4 border-2 border-foreground bg-card p-4"
              >
                <Avatar name={person.name} image={person.image} index={i} size="sm" />
                <strong className="flex-1">{person.name}</strong>
                <button
                  type="button"
                  disabled={busy === person.id}
                  onClick={() => void unblock(person.id)}
                  className="inline-flex h-9 items-center gap-2 border-2 border-foreground bg-background px-3 font-mono text-xs font-bold uppercase disabled:opacity-50"
                >
                  <Undo2 className="size-3.5" /> Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle kicker="If something goes wrong" title="Getting help" />
        <PaperCard className="p-6">
          <div className="flex gap-4">
            <ShieldAlert className="size-6 shrink-0 text-primary" />
            <div className="space-y-2 text-sm">
              <p>
                <strong>Report a person or a plan</strong> from the ⋯ menu on their card. Reports
                are recorded and reviewed by a human — there&apos;s no automated action, so tell us
                what happened.
              </p>
              <p>
                <strong>Leaving a plan</strong> frees your seat straight away. You&apos;ll find the
                option on the plan itself.
              </p>
              <p>
                <strong>If you&apos;re in danger, call 112.</strong> We&apos;re a way to meet
                people, not an emergency service.
              </p>
            </div>
          </div>
        </PaperCard>
      </section>

      <section>
        <SectionTitle kicker="This device" title="Account" />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void signOut().then(() => router.push("/"))}
            className="inline-flex h-11 items-center border-2 border-foreground bg-background px-5 font-bold uppercase shadow-stamp-sm active:translate-x-0.5 active:translate-y-0.5"
          >
            Sign out
          </button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Signed in as {me.email}.
        </p>
      </section>
    </div>
  );
}
