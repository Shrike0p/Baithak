import Image from "next/image";
import Link from "next/link";
import { Lock } from "lucide-react";
import { planArt } from "@/lib/plan-art";
import { Pill } from "@/components/ui";
import type { PlanSummary } from "@/lib/api";

function when(iso: string) {
  return new Date(iso)
    .toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    .toUpperCase();
}

/**
 * The public teaser. Shows everything a host is happy to advertise — the plan,
 * the vibe, how full it is — and nothing about the guests, who never agreed to
 * be listed publicly. Clicking converts rather than navigating: the app itself
 * is behind sign-in, so there's no half-signed-in state to land in.
 */
export function GlimpseCard({ plan }: { plan: PlanSummary }) {
  const art = planArt(plan.category, plan.imageUrl);
  const spotsLeft = Math.max(0, plan.capacity - plan.confirmedCount);

  return (
    <Link
      href={`/sign-up?next=/plans/${plan.id}`}
      className="paper-card group flex h-full flex-col overflow-hidden transition-transform hover:-translate-y-1"
    >
      <div className="relative overflow-hidden">
        <Image
          src={art.image}
          alt={plan.title}
          width={1100}
          height={800}
          className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute left-3 top-3">
          <Pill tone="orange">{when(plan.startsAt)}</Pill>
        </span>
      </div>

      <div className={`${art.tone} flex flex-1 flex-col p-5`}>
        <p className="meta-label">{plan.neighborhood.split(",")[0]}</p>
        <h3 className="mt-2 text-2xl uppercase leading-none">{plan.title}</h3>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {plan.vibeTags.slice(0, 3).map((tag) => (
            <Pill key={tag}>{tag}</Pill>
          ))}
        </div>

        <div className="mt-auto pt-5">
          <div className="flex items-center justify-between border-y-2 border-foreground py-2 font-mono text-xs font-bold">
            <span>
              {plan.confirmedCount} / {plan.capacity} going
            </span>
            <span>{spotsLeft > 0 ? `${spotsLeft} spots` : "Full"}</span>
          </div>
          <p className="mt-3 flex items-center gap-1.5 font-mono text-xs font-bold">
            <Lock className="size-3" />
            Join to see who&apos;s going
          </p>
        </div>
      </div>
    </Link>
  );
}
