import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Check, MapPin, Sparkles } from "lucide-react";
import { getPerson } from "@/lib/api";
import { Avatar } from "@/components/person-card";
import { SocialBadge } from "@/components/social-badge";
import { PersonSafety } from "@/components/person-safety";
import { Button, Pill, PaperCard, MetaLabel, SectionTitle } from "@/components/ui";

function when(iso: string) {
  return new Date(iso)
    .toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    .toUpperCase();
}

export default async function PersonPage({ params }: PageProps<"/people/[id]">) {
  const { id } = await params;
  const person = await getPerson(id).catch(() => null);
  if (!person) notFound();

  const stats: [string, string][] = [
    [String(person.plansAttended), "Attended"],
    [String(person.plansHosted), "Hosted"],
    [person.trustScore > 0 ? `★ ${person.trustScore.toFixed(1)}` : "—", "Trust"],
  ];

  return (
    <div className="mx-auto max-w-4xl px-5 pb-24 pt-10 md:px-8">
      <div className="flex flex-wrap items-end gap-6">
        <Avatar name={person.name} image={person.image} size="lg" />
        <div className="min-w-0 flex-1">
          <MetaLabel className="text-primary">
            Member since {when(person.memberSince)}
          </MetaLabel>
          <h1 className="mt-2 text-5xl uppercase md:text-6xl">{person.name}</h1>
          <p className="mt-1 text-muted-foreground">
            {[person.age, person.city, person.occupation].filter(Boolean).join(" · ") ||
              "Still filling in the details"}
          </p>
        </div>
        {person.isYou && (
          <Button href="/profile" variant="outline" size="sm">
            Edit your profile
          </Button>
        )}
      </div>

      {/* Why you might get on — the same reasons language used everywhere else,
          never a bare compatibility score. */}
      {!person.isYou && (person.sharedVibes.length > 0 || person.sharedPlans > 0) && (
        <div className="mt-8 flex flex-wrap gap-2">
          {person.sharedPlans > 0 && (
            <Pill tone="green">
              <Sparkles className="size-3" /> {person.sharedPlans} plan
              {person.sharedPlans === 1 ? "" : "s"} together
            </Pill>
          )}
          {person.sharedVibes.map((v) => (
            <Pill key={v} tone="purple">
              Both into {v}
            </Pill>
          ))}
        </div>
      )}

      <div className="mt-8 grid grid-cols-3 border-2 border-foreground bg-card shadow-stamp">
        {stats.map(([value, label]) => (
          <div key={label} className="border-r-2 border-foreground p-5 text-center last:border-r-0">
            <p className="font-display text-3xl">{value}</p>
            <MetaLabel className="text-muted-foreground">{label}</MetaLabel>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <SectionTitle kicker="Never a mystery number" title="Why this score" />
        <PaperCard className="p-6">
          <ul className="space-y-2">
            {person.trustReasons.map((reason) => (
              <li key={reason} className="flex gap-3">
                <Check className="mt-1 size-4 shrink-0 text-accent" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            Built from turning up, hosting, and what people said afterwards. It moves slowly on
            purpose.
          </p>
        </PaperCard>
      </section>

      {person.bio && (
        <PaperCard className="mt-8 p-6">
          <p className="text-lg">{person.bio}</p>
        </PaperCard>
      )}

      {person.vibeTags.length > 0 && (
        <section className="mt-10">
          <SectionTitle kicker="What they're into" title="Their vibe" />
          <div className="flex flex-wrap gap-2">
            {person.vibeTags.map((v) => (
              <Pill key={v}>{v}</Pill>
            ))}
          </div>
        </section>
      )}

      {person.social && (
        <section className="mt-10">
          <SectionTitle kicker="Not verified by us" title="Elsewhere" />
          <SocialBadge social={person.social} />
        </section>
      )}

      {person.nights.length > 0 && (
        <section className="mt-12">
          <SectionTitle
            kicker="Proof they show up"
            title={`${person.name}'s nights`}
          />
          <div className="grid gap-6 sm:grid-cols-2">
            {person.nights.map((night) => (
              <Link
                key={night.id}
                href={`/plans/${night.id}`}
                className="group border-2 border-foreground bg-paper p-3 shadow-stamp transition-transform hover:-translate-y-1"
              >
                <div className="overflow-hidden">
                  <Image
                    src={night.imageUrl ?? "/assets/house-party.jpg"}
                    alt={night.title}
                    width={600}
                    height={450}
                    className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <h3 className="mt-3 text-xl uppercase leading-tight">{night.title}</h3>
                <MetaLabel className="mt-1 block text-muted-foreground">
                  <CalendarDays className="mr-1 inline size-3" />
                  {when(night.startsAt)} · <MapPin className="mr-1 inline size-3" />
                  {night.neighborhood}
                </MetaLabel>
                <p className="mt-1 text-sm text-muted-foreground">
                  {night.people} people · {night.photos} photos
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!person.isYou && (
        <div className="mt-14 border-t-2 border-foreground/20 pt-6">
          <PersonSafety userId={person.id} name={person.name} />
        </div>
      )}
    </div>
  );
}
