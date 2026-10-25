import Image from "next/image";
import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { getPlans } from "@/lib/api";
import { planArt } from "@/lib/plan-art";
import { Button, Pill, Logo, SectionTitle } from "@/components/ui";
import { GlimpseCard } from "@/components/glimpse-card";

const CATEGORIES = ["House parties", "Game nights", "Dinners", "Trips"];

function when(iso: string) {
  return new Date(iso)
    .toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" })
    .toUpperCase();
}

export default async function LandingPage() {
  // Real plans, not mock captions. Hosts are advertising, so this is safe to
  // show publicly — it's the named guests that stay behind sign-in.
  const plans = await getPlans().catch(() => []);
  const [first, second] = plans;
  const spotsOpen = plans.reduce((n, p) => n + Math.max(0, p.capacity - p.confirmedCount), 0);
  return (
    <main className="min-h-screen overflow-hidden">
      <header className="flex h-20 items-center justify-between border-b-2 border-foreground px-5 md:px-10">
        <Logo />
        <span className="meta-label hidden sm:block">Est. tonight</span>
        <Button href="/sign-in" variant="outline" size="sm">
          I have an account
        </Button>
      </header>

      <section className="relative grid min-h-[calc(100vh-5rem)] items-center gap-8 overflow-hidden px-5 py-10 lg:grid-cols-[.9fr_1.1fr] lg:px-12">
        <div className="relative z-10 max-w-3xl">
          <Pill tone="green">
            <ShieldCheck className="size-3" /> People-first plans
          </Pill>

          <h1 className="mt-6 text-[clamp(3.4rem,6vw,7.5rem)] uppercase leading-[.86]">
            You don&apos;t need a squad
            <br />
            <span className="text-primary">to have plans.</span>
          </h1>

          <p className="mt-7 max-w-xl text-xl font-medium md:text-2xl">
            Find people. Find plans. Make some memories.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Button href="/sign-up">
              Find my people <ChevronRight />
            </Button>
            <Button href="/sign-up?next=/plans/new" variant="outline">
              Make a plan
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            {CATEGORIES.map((c) => (
              <Pill key={c}>{c}</Pill>
            ))}
          </div>

          {plans.length > 0 && (
            <p className="meta-label mt-6 text-muted-foreground">
              {plans.length} {plans.length === 1 ? "plan" : "plans"} open now ·{" "}
              {spotsOpen} {spotsOpen === 1 ? "spot" : "spots"} left
            </p>
          )}
        </div>

        <div className="relative mx-auto h-[540px] w-full max-w-3xl lg:h-[650px]">
          <Link
            href={first ? `/sign-up?next=/plans/${first.id}` : "/sign-up"}
            className="absolute left-[3%] top-[3%] z-10 block w-[62%] rotate-[-4deg] border-2 border-foreground bg-paper p-3 shadow-stamp-lg transition-transform hover:rotate-[-1deg]"
          >
            <Image
              src={first ? planArt(first.category, first.imageUrl).image : "/assets/house-party.jpg"}
              alt={first?.title ?? "Friends dancing at a house party"}
              width={1400}
              height={1000}
              priority
              className="aspect-[4/3] w-full object-cover"
            />
            <p className="mt-2 font-mono text-xs font-bold uppercase">
              {first
                ? `${when(first.startsAt)} · ${first.neighborhood.split(",")[0]} · ${first.capacity - first.confirmedCount} SPOTS`
                : "SATURDAY · HSR · 12 NEW FACES"}
            </p>
          </Link>

          <Link
            href={second ? `/sign-up?next=/plans/${second.id}` : "/sign-up"}
            className="absolute bottom-[3%] right-[3%] block w-[52%] rotate-3 border-2 border-foreground bg-paper p-3 shadow-stamp-lg transition-transform hover:rotate-1"
          >
            <Image
              src={second ? planArt(second.category, second.imageUrl).image : "/assets/dinner-party.jpg"}
              alt={second?.title ?? "Friends sharing dinner"}
              width={1100}
              height={800}
              className="aspect-[4/3] w-full object-cover"
            />
            <p className="mt-2 font-mono text-xs font-bold uppercase">
              {second ? second.title : "DINNER, BUT MAKE IT STRANGERS"}
            </p>
          </Link>

          <div className="absolute right-[1%] top-[10%] rotate-6 border-2 border-foreground bg-secondary px-4 py-3 font-display text-secondary-foreground shadow-stamp-sm">
            GOOD PEOPLE
            <br />
            GOOD NIGHTS
          </div>

          <div className="absolute bottom-[17%] left-0 z-20 -rotate-6 rounded-full border-2 border-foreground bg-accent px-5 py-3 font-mono text-xs font-bold shadow-stamp-sm">
            VERIFIED · 4.8 ★
          </div>
        </div>
      </section>

      {plans.length > 0 && (
        <section className="border-t-2 border-foreground px-5 py-14 md:px-12">
          <SectionTitle
            kicker={`${plans.length} open now`}
            title="What's on this week"
          />
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {plans.slice(0, 6).map((plan) => (
              <GlimpseCard key={plan.id} plan={plan} />
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-2 border-foreground bg-secondary p-7 text-secondary-foreground shadow-stamp">
            <div>
              <h2 className="text-3xl uppercase">Who&apos;s actually going?</h2>
              <p className="mt-2 max-w-xl">
                We show you the crew, the host&apos;s history and why you might get on —
                before you commit to anything. Guests stay private until you&apos;re in.
              </p>
            </div>
            <Button href="/sign-up" variant="outline">
              Find my people <ChevronRight />
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
