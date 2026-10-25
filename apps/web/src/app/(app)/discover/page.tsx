import Link from "next/link";
import { getPlans, getPeople, getHappenedPlans } from "@/lib/api";
import { Avatar } from "@/components/person-card";
import { PaperCard, SectionTitle } from "@/components/ui";
import { HappenedStrip } from "@/components/happened-strip";
import { PlanFilters } from "@/components/plan-filters";

export default async function DiscoverPage() {
  // Plans are public; the people strip needs a session. Signed out, we simply
  // show fewer sections rather than failing the page.
  const [plans, people, happened] = await Promise.all([
    getPlans(),
    getPeople().catch(() => null),
    getHappenedPlans().catch(() => []),
  ]);
  const yourPeople = people ? [...people.met, ...people.suggested].slice(0, 6) : [];
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-24 pt-10 md:px-8">
      <div className="mb-10 md:flex md:items-end md:justify-between">
        <div>
          <p className="meta-label text-primary">{today}</p>
          <h1 className="mt-3 text-5xl uppercase md:text-7xl">What&apos;s the plan?</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Find something. Find your people.
          </p>
        </div>
      </div>

      {plans.length === 0 ? (
        <PaperCard className="p-16 text-center">
          <h2 className="text-4xl uppercase">Nothing yet.</h2>
          <p className="mt-3 text-muted-foreground">
            Give us a minute. Or make your own plan.
          </p>
        </PaperCard>
      ) : (
        <>
          <PlanFilters plans={plans} />

          {yourPeople.length > 0 && (
            <section className="mt-14 border-y-2 border-foreground bg-card px-5 py-7">
              <SectionTitle
                kicker="Not totally random"
                title="Your people are going"
                action="Find people"
                href="/people"
              />
              <div className="hide-scrollbar flex gap-4 overflow-x-auto pb-2">
                {yourPeople.map((person, i) => (
                  <Link
                    key={person.id}
                    href={`/people/${person.id}`}
                    className="flex min-w-32 flex-col items-center gap-2"
                  >
                    <Avatar name={person.name} image={person.image} index={i} />
                    <strong>{person.name}</strong>
                    <span className="meta-label text-muted-foreground">
                      {person.sharedPlans > 0
                        ? `${person.sharedPlans} shared`
                        : `${person.plansAttended} plans`}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="mt-14 grid gap-8 md:grid-cols-[.75fr_1.25fr]">
            <div className="border-2 border-foreground bg-secondary p-7 text-secondary-foreground shadow-stamp">
              <p className="meta-label">New in town</p>
              <h2 className="mt-5 text-4xl uppercase">
                No squad?
                <br />
                Good start.
              </h2>
              <p className="mt-5">
                Meet people who are also figuring out their weekend.
              </p>
            </div>
            <div>
              <SectionTitle kicker="People, not profiles" title="You might vibe" />
              {yourPeople.length === 0 ? (
                <PaperCard className="p-6">
                  <p className="text-muted-foreground">
                    Once you join a plan, the people you meet show up here.
                  </p>
                </PaperCard>
              ) : (
                <div className="space-y-3">
                  {yourPeople.slice(0, 2).map((person, i) => (
                    <div key={person.id} className="paper-card flex items-center gap-4 p-4">
                      <Avatar name={person.name} image={person.image} index={i} />
                      <div className="min-w-0">
                        <h3 className="text-lg uppercase">{person.name}</h3>
                        <p className="text-sm">{person.reasons[0]}</p>
                      </div>
                      <span className="ml-auto font-mono text-sm font-bold">
                        ★ {person.trustScore.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      <div className="mt-14">
        <HappenedStrip plans={happened} />
      </div>
    </div>
  );
}
