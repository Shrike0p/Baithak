import { getMyPlans, type PlanSummary } from "@/lib/api";
import { PlanCard } from "@/components/plan-card";
import { Button, Pill, PaperCard, SectionTitle } from "@/components/ui";

function PlanGroup({
  kicker,
  title,
  plans,
  status,
  empty,
  roomLink = false,
}: {
  kicker: string;
  title: string;
  plans: PlanSummary[];
  status?: string;
  empty: { heading: string; body: string };
  roomLink?: boolean;
}) {
  return (
    <section>
      <SectionTitle kicker={kicker} title={title} />
      {plans.length === 0 ? (
        <PaperCard className="p-10 text-center">
          <h3 className="text-2xl uppercase">{empty.heading}</h3>
          <p className="mt-2 text-muted-foreground">{empty.body}</p>
        </PaperCard>
      ) : (
        <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              status={status}
              href={roomLink ? `/plans/${plan.id}/room` : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function PlansPage() {
  const { hosting, going, requested } = await getMyPlans();
  const total = hosting.length + going.length + requested.length;

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-24 pt-10 md:px-8">
      <div className="mb-10 md:flex md:items-end md:justify-between">
        <div>
          <p className="meta-label text-primary">Everything you said yes to</p>
          <h1 className="mt-3 text-5xl uppercase md:text-7xl">Your plans</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            {total === 0
              ? "Nothing on the calendar yet."
              : `${total} plan${total > 1 ? "s" : ""} in motion.`}
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 md:mt-0">
          <Pill tone="green">{going.length} going</Pill>
          <Pill tone="orange">{hosting.length} hosting</Pill>
          <Pill>{requested.length} requested</Pill>
        </div>
      </div>

      <div className="space-y-14">
        <PlanGroup
          kicker="You're in"
          title="Going"
          plans={going}
          status="You're in ✓"
          roomLink
          empty={{
            heading: "Nothing yet.",
            body: "Once a host accepts you, the plan shows up here.",
          }}
        />

        <PlanGroup
          kicker="Waiting on the host"
          title="Requested"
          plans={requested}
          status="Pending"
          empty={{
            heading: "No pending requests.",
            body: "Find something on Discover and ask to join.",
          }}
        />

        <PlanGroup
          kicker="Your door, your crowd"
          title="Hosting"
          plans={hosting}
          status="You're hosting"
          roomLink
          empty={{
            heading: "No one's coming over yet.",
            body: "Make a plan and we'll help you build the crowd.",
          }}
        />
      </div>

      <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-2 border-foreground bg-secondary p-7 text-secondary-foreground shadow-stamp">
        <div>
          <h2 className="text-3xl uppercase">Got an idea?</h2>
          <p className="mt-2">You don&apos;t need a squad to start one.</p>
        </div>
        <Button href="/plans/new" variant="outline">
          Make a plan
        </Button>
      </div>
    </div>
  );
}
