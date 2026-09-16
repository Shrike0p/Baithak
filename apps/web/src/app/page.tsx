import Image from "next/image";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { Button, Pill, Logo } from "@/components/ui";

const CATEGORIES = ["House parties", "Game nights", "Dinners", "Trips"];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <header className="flex h-20 items-center justify-between border-b-2 border-foreground px-5 md:px-10">
        <Logo />
        <span className="meta-label hidden sm:block">Bangalore · Est. tonight</span>
        <Button href="/discover" variant="outline" size="sm">
          I have an account
        </Button>
      </header>

      <section className="relative grid min-h-[calc(100vh-5rem)] items-center gap-8 overflow-hidden px-5 py-10 lg:grid-cols-[.9fr_1.1fr] lg:px-12">
        <div className="relative z-10 max-w-3xl">
          <Pill tone="green">
            <ShieldCheck className="size-3" /> People-first plans
          </Pill>

          <h1 className="mt-6 text-[clamp(3.4rem,7vw,7.5rem)] uppercase leading-[.86]">
            You don&apos;t need a squad
            <br />
            <span className="text-primary">to have plans.</span>
          </h1>

          <p className="mt-7 max-w-xl text-xl font-medium md:text-2xl">
            Find people. Find plans. Make some memories.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Button href="/discover">
              Find my people <ChevronRight />
            </Button>
            <Button href="/plans/new" variant="outline">
              Make a plan
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            {CATEGORIES.map((c) => (
              <Pill key={c}>{c}</Pill>
            ))}
          </div>
        </div>

        <div className="relative mx-auto h-[540px] w-full max-w-3xl lg:h-[650px]">
          <div className="absolute left-[3%] top-[3%] z-10 w-[62%] rotate-[-4deg] border-2 border-foreground bg-paper p-3 shadow-stamp-lg">
            <Image
              src="/assets/house-party.jpg"
              alt="Friends dancing at a Bangalore house party"
              width={1400}
              height={1000}
              priority
              className="aspect-[4/3] w-full object-cover"
            />
            <p className="mt-2 font-mono text-xs font-bold">SATURDAY · HSR · 12 NEW FACES</p>
          </div>

          <div className="absolute bottom-[3%] right-[3%] w-[52%] rotate-3 border-2 border-foreground bg-paper p-3 shadow-stamp-lg">
            <Image
              src="/assets/dinner-party.jpg"
              alt="Friends sharing dinner"
              width={1100}
              height={800}
              className="aspect-[4/3] w-full object-cover"
            />
            <p className="mt-2 font-mono text-xs font-bold">DINNER, BUT MAKE IT STRANGERS</p>
          </div>

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
    </main>
  );
}
