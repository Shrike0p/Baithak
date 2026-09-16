import { getPeople, type Person } from "@/lib/api";
import { PersonCard } from "@/components/person-card";
import { Pill, PaperCard, SectionTitle, Button } from "@/components/ui";

function PeopleGroup({
  kicker,
  title,
  people,
  offset = 0,
  empty,
}: {
  kicker: string;
  title: string;
  people: Person[];
  offset?: number;
  empty: { heading: string; body: string };
}) {
  return (
    <section>
      <SectionTitle kicker={kicker} title={title} />
      {people.length === 0 ? (
        <PaperCard className="p-10 text-center">
          <h3 className="text-2xl uppercase">{empty.heading}</h3>
          <p className="mt-2 text-muted-foreground">{empty.body}</p>
        </PaperCard>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {people.map((person, i) => (
            <PersonCard
              key={person.id}
              person={person}
              index={offset + i}
              reason={person.reasons[0]}
              badge={person.plansHosted > 0 ? "Hosts plans" : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function PeoplePage() {
  const { met, suggested } = await getPeople();

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-24 pt-10 md:px-8">
      <div className="mb-10 md:flex md:items-end md:justify-between">
        <div>
          <p className="meta-label text-primary">Humans, not followers</p>
          <h1 className="mt-3 text-5xl uppercase md:text-7xl">Find your people</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            The ones you&apos;ve met, and the ones you probably should.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 md:mt-0">
          <Pill tone="orange">You might vibe</Pill>
          <Pill>From your plans</Pill>
          <Pill>Met IRL</Pill>
        </div>
      </div>

      <div className="space-y-14">
        <PeopleGroup
          kicker="You've shared a room with them"
          title="From your plans"
          people={met}
          empty={{
            heading: "You haven't met your people yet.",
            body: "Go to a plan. That's usually how this starts.",
          }}
        />

        <PeopleGroup
          kicker="People, not profiles"
          title="You might vibe"
          people={suggested}
          offset={met.length}
          empty={{
            heading: "That's everyone for now.",
            body: "More people join every week.",
          }}
        />
      </div>

      <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-2 border-foreground bg-accent p-7 shadow-stamp">
        <div>
          <h2 className="text-3xl uppercase">Meeting people takes a plan.</h2>
          <p className="mt-2">Trust here is built from showing up, not from a follow button.</p>
        </div>
        <Button href="/discover" variant="outline">
          Find a plan
        </Button>
      </div>
    </div>
  );
}
