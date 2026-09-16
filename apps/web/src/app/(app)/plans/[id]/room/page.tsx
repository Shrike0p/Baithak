import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Clock3,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { getPartyRoom, type PartyRoom } from "@/lib/api";
import { Avatar } from "@/components/person-card";
import { Countdown } from "@/components/countdown";
import { Button, Pill, PaperCard, SectionTitle } from "@/components/ui";

const TABS = [
  { key: "people", label: "People" },
  { key: "today", label: "Today" },
  { key: "memories", label: "Memories" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function formatTime(iso: string) {
  return new Date(iso)
    .toLocaleString("en-IN", { hour: "numeric", minute: "2-digit" })
    .toUpperCase();
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function PeopleTab({ room }: { room: PartyRoom }) {
  const vibeMatches = room.crew.filter((m) => !m.isYou && m.user.sharedVibes.length > 0);

  return (
    <div className="space-y-12">
      <section>
        <SectionTitle kicker="Already less strange" title="Get to know the crew" />
        <div className="grid gap-4 md:grid-cols-2">
          {room.crew.map((member, i) => (
            <div key={member.user.id} className="paper-card p-4">
              <div className="flex gap-4">
                <Avatar name={member.user.name} index={i} />
                <div className="min-w-0">
                  <h3 className="text-lg uppercase">
                    {member.user.name}
                    {member.isYou && <span className="text-muted-foreground"> (you)</span>}
                  </h3>
                  <p className="text-sm">
                    {[member.user.age, member.user.city, member.user.occupation]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <span className="ml-auto font-mono text-sm font-bold">
                  ★ {member.user.trustScore.toFixed(1)}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {member.user.vibeTags.map((v) => (
                  <Pill key={v} tone={member.user.sharedVibes.includes(v) ? "purple" : "plain"}>
                    {v}
                  </Pill>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <p className="text-sm font-bold">{member.user.plansAttended} plans attended</p>
                <Pill
                  tone={
                    member.role === "HOST" ? "orange" : member.firstTime ? "plain" : "green"
                  }
                >
                  {member.role === "HOST"
                    ? "Host"
                    : member.firstTime
                      ? "First time"
                      : "Returning member"}
                </Pill>
              </div>
            </div>
          ))}
        </div>
      </section>

      {vibeMatches.length > 0 && (
        <section>
          <SectionTitle kicker="Start with something real" title="People you might vibe with" />
          <div className="space-y-4">
            {vibeMatches.map((m, i) => (
              <PaperCard
                key={m.user.id}
                className="grid gap-4 p-5 md:grid-cols-[auto_1fr_auto] md:items-center"
              >
                <Avatar name={m.user.name} index={i} size="lg" />
                <div>
                  <h3 className="text-2xl uppercase">
                    You + {m.user.name}
                  </h3>
                  <p className="mt-2">
                    You both like {m.user.sharedVibes.join(" & ")}
                    {m.user.plansAttended > 1 &&
                      ` · they've been to ${m.user.plansAttended} plans`}
                  </p>
                </div>
              </PaperCard>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TodayTab({ room }: { room: PartyRoom }) {
  const isToday = new Date(room.startsAt).toDateString() === new Date().toDateString();
  const isPast = new Date(room.startsAt).getTime() < Date.now();

  return (
    <div>
      <p className="meta-label text-primary">
        {isPast ? "This one's done" : isToday ? "Event day mode" : "Getting there"}
      </p>
      <h2 className="mt-3 text-5xl uppercase md:text-7xl">
        {isPast ? "That was fun." : isToday ? "Today's the day." : formatDay(room.startsAt)}
      </h2>

      <div className="mt-9 grid gap-5 md:grid-cols-3">
        <div className="paper-card bg-primary p-6">
          <Clock3 />
          <p className="mt-8 font-display text-4xl">{formatTime(room.startsAt)}</p>
        </div>

        <div className="paper-card p-6">
          <MapPin />
          <p className="mt-8 font-display text-2xl uppercase">{room.neighborhood}</p>
          {room.exactAddress ? (
            <p className="mt-2 text-sm font-bold">{room.exactAddress}</p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              The host hasn&apos;t added an exact address yet.
            </p>
          )}
        </div>

        <div className="paper-card bg-accent p-6">
          <UsersRound />
          <p className="mt-8 font-display text-3xl uppercase">
            {room.composition.total} confirmed
          </p>
          <p className="mt-2 text-sm font-bold">
            {room.composition.returning} returning · {room.composition.firstTimers} first-timers
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button href={`/plans/${room.id}`} variant="outline">
          See the plan
        </Button>
        <Button href="/settings" variant="outline">
          <ShieldCheck /> Safety / help
        </Button>
      </div>

      <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <LockKeyhole className="size-3" />
        The exact address is only visible to the {room.composition.total} people in this room.
      </p>
    </div>
  );
}

function MemoriesTab({ room }: { room: PartyRoom }) {
  const tilts = ["rotate-[-2deg]", "rotate-2", "rotate-[-1deg]", "rotate-1"];

  return (
    <div className="space-y-12">
      <section>
        <SectionTitle
          kicker={
            room.memories.length > 0
              ? `${room.memories.length} photos · shared with the crew`
              : "After the night"
          }
          title={room.memories.length > 0 ? "Last night" : "No memories yet"}
        />

        {room.memories.length === 0 ? (
          <PaperCard className="p-10 text-center">
            <h3 className="text-2xl uppercase">Nothing here yet.</h3>
            <p className="mt-2 text-muted-foreground">
              Photos from the night land here afterwards — just for the people who were there.
            </p>
          </PaperCard>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {room.memories.map((photo, i) => (
              <figure
                key={photo.id}
                className={`${tilts[i % tilts.length]} border-2 border-foreground bg-paper p-3 shadow-stamp transition-transform duration-200 hover:rotate-0`}
              >
                <Image
                  src={photo.url}
                  alt={photo.caption ?? "Party photo"}
                  width={800}
                  height={600}
                  className="aspect-[4/3] w-full object-cover"
                />
                <figcaption className="mt-3">
                  <p className="font-bold">{photo.caption}</p>
                  <p className="meta-label mt-1 text-muted-foreground">
                    {photo.takenAt ? formatTime(photo.takenAt) : ""} · {photo.uploader}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      {room.previousNights.length > 0 && (
        <section>
          <SectionTitle
            kicker="Proof it was a good idea"
            title={`${room.host.name}'s previous nights`}
          />
          <div className="hide-scrollbar flex gap-5 overflow-x-auto pb-6">
            {room.previousNights.map((night, i) => (
              <Link
                key={night.id}
                href={`/plans/${night.id}`}
                className={`${tilts[i % tilts.length]} min-w-[280px] border-2 border-foreground bg-paper p-3 shadow-stamp transition-transform duration-200 hover:rotate-0`}
              >
                <Image
                  src={night.imageUrl ?? "/assets/house-party.jpg"}
                  alt={night.title}
                  width={800}
                  height={600}
                  className="h-52 w-full object-cover"
                />
                <h3 className="mt-3 text-xl uppercase">{night.title}</h3>
                <p className="meta-label mt-1">
                  {night.people} people · {night.photos} photos
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default async function PartyRoomPage({
  params,
  searchParams,
}: PageProps<"/plans/[id]/room">) {
  const { id } = await params;
  const { tab } = await searchParams;
  const room = await getPartyRoom(id).catch(() => null);
  if (!room) notFound();

  const active: TabKey = TABS.some((t) => t.key === tab) ? (tab as TabKey) : "people";

  return (
    <div className="pb-24">
      <div className="border-b-2 border-foreground bg-secondary px-5 py-7 text-secondary-foreground md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="meta-label">Private party room · You&apos;re in ✓</p>
            <h1 className="mt-2 text-4xl uppercase md:text-6xl">{room.title}</h1>
            <p className="mt-2 font-mono text-sm font-bold">
              {room.composition.total} people · {room.neighborhood}
            </p>
          </div>
          <div className="border-2 border-foreground bg-background px-5 py-3 text-center text-foreground shadow-stamp">
            <span className="meta-label">
              {new Date(room.startsAt).getTime() < Date.now() ? "Happened" : "Countdown"}
            </span>
            <Countdown startsAt={room.startsAt} />
          </div>
        </div>
      </div>

      <div className="border-b-2 border-foreground px-5 md:px-8">
        <div className="hide-scrollbar flex overflow-x-auto">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/plans/${room.id}/room?tab=${t.key}`}
              className={`border-x border-foreground px-6 py-4 font-mono text-xs font-bold uppercase ${
                active === t.key ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        {active === "people" && <PeopleTab room={room} />}
        {active === "today" && <TodayTab room={room} />}
        {active === "memories" && <MemoriesTab room={room} />}
      </div>
    </div>
  );
}
