import Image from "next/image";
import Link from "next/link";
import { Lock } from "lucide-react";
import type { HappenedPlan } from "@/lib/api";
import { MetaLabel, SectionTitle } from "@/components/ui";

function when(iso: string) {
  return new Date(iso)
    .toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    .toUpperCase();
}

/**
 * Parties that already happened — the proof that any of this is real.
 *
 * Shows only what each host published. The locked tile is a count drawn as an
 * empty frame, never a blurred copy of a private photo: a blurred <img> still
 * ships the real file to the browser.
 */
export function HappenedStrip({ plans }: { plans: HappenedPlan[] }) {
  if (plans.length === 0) return null;

  return (
    <section>
      <SectionTitle kicker="Proof it works" title="Already happened" />

      <div className="hide-scrollbar flex gap-6 overflow-x-auto pb-6 pt-2">
        {plans.map((plan) => (
          <Link
            key={plan.id}
            href={`/plans/${plan.id}`}
            className="group min-w-[300px] max-w-[300px] border-2 border-foreground bg-paper p-3 shadow-stamp transition-transform hover:-translate-y-1"
          >
            <div className="relative overflow-hidden">
              {plan.preview[0] ? (
                <Image
                  src={plan.preview[0].url}
                  alt={plan.preview[0].caption ?? plan.title}
                  width={600}
                  height={450}
                  className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <Image
                  src={plan.imageUrl ?? "/assets/house-party.jpg"}
                  alt={plan.title}
                  width={600}
                  height={450}
                  className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              )}

              {plan.lockedCount > 0 && (
                <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 border-2 border-foreground bg-background px-2 py-1 font-mono text-xs font-bold">
                  <Lock className="size-3" /> +{plan.lockedCount}
                </span>
              )}
            </div>

            <h3 className="mt-3 text-xl uppercase leading-tight">{plan.title}</h3>
            <MetaLabel className="mt-1 block text-muted-foreground">
              {when(plan.startsAt)} · {plan.neighborhood} · {plan.people} people
            </MetaLabel>
            <p className="mt-2 text-sm text-muted-foreground">
              Hosted by {plan.host.name} · ★ {plan.host.trustScore.toFixed(1)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
