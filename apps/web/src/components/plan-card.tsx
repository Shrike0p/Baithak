import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { planArt } from "@/lib/plan-art";
import { Pill } from "@/components/ui";
import type { PlanSummary } from "@/lib/api";

function formatWhen(iso: string) {
  return new Date(iso)
    .toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" })
    .toUpperCase();
}

export function PlanCard({
  plan,
  large = false,
  status,
  href,
}: {
  plan: PlanSummary;
  large?: boolean;
  status?: string;
  href?: string;
}) {
  const art = planArt(plan.category, plan.imageUrl);

  return (
    <Link href={href ?? `/plans/${plan.id}`} className="block">
      <article
        className={`paper-card group h-full cursor-pointer overflow-hidden transition-transform hover:-translate-y-1 ${
          large ? "md:grid md:grid-cols-[1.2fr_.8fr]" : ""
        }`}
      >
        <div className="relative overflow-hidden">
          <Image
            src={art.image}
            alt={`${plan.title} gathering`}
            width={large ? 1400 : 1100}
            height={large ? 1000 : 800}
            className={`${large ? "h-64 md:h-full" : "h-48"} w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]`}
          />
          <span className="absolute left-3 top-3">
            <Pill tone="orange">{formatWhen(plan.startsAt)}</Pill>
          </span>
          {status && (
            <span className="absolute right-3 top-3">
              <Pill tone="green">{status}</Pill>
            </span>
          )}
        </div>

        <div className={`${art.tone} flex flex-col p-5`}>
          <p className="meta-label">{plan.neighborhood}</p>
          <h3 className={`${large ? "text-4xl md:text-5xl" : "text-2xl"} mt-3 uppercase leading-none`}>
            {plan.title}
          </h3>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {plan.vibeTags.slice(0, 3).map((tag) => (
              <Pill key={tag}>{tag}</Pill>
            ))}
          </div>

          <div className="mt-auto pt-6">
            <div className="flex items-center justify-between border-y-2 border-foreground py-2 font-mono text-xs font-bold">
              <span>
                {plan.confirmedCount} / {plan.capacity} people
              </span>
              <span>
                Host · {plan.host.name} ★ {plan.host.trustScore.toFixed(1)}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-1 font-mono text-xs font-bold">
              {href ? "Open party room" : "See the crew"} <ChevronRight className="size-3" />
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
