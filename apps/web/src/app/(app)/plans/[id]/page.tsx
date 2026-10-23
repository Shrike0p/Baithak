import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getSessionCookie } from "better-auth/cookies";
import {
  Check,
  ChevronRight,
  LockKeyhole,
  MapPin,
  Music2,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { getMe, getPlan } from "@/lib/api";
import { planArt } from "@/lib/plan-art";
import { CoverPicker } from "@/components/cover-picker";
import { MemoryGallery } from "@/components/memory-gallery";
import { HostPlanControls } from "@/components/host-plan-controls";
import { PlanSafety } from "@/components/plan-safety";
import { SharePlan } from "@/components/share-plan";
import { Button, Pill, PaperCard, SectionTitle } from "@/components/ui";
import { Avatar } from "@/components/person-card";
import { RequestToJoin } from "@/components/request-to-join";

/**
 * What a shared link says in the preview text. Public on purpose — everything
 * here is the host advertising. The crew and the exact address are not
 * included, because a forwarded link reaches people who were never invited.
 */
export async function generateMetadata({ params }: PageProps<"/plans/[id]">): Promise<Metadata> {
  const { id } = await params;
  const plan = await getPlan(id).catch(() => null);
  if (!plan) return { title: "Plan not found — Baithak" };

  const when = new Date(plan.startsAt).toLocaleString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });
  const description = `${when} · ${plan.neighborhood} · hosted by ${plan.host.name}. You don't need a squad to have plans.`;

  return {
    title: `${plan.title} — Baithak`,
    description,
    openGraph: { title: plan.title, description, type: "website" },
    twitter: { card: "summary_large_image", title: plan.title, description },
  };
}

function formatWhen(iso: string) {
  return new Date(iso)
    .toLocaleString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    })
    .toUpperCase();
}

export default async function PlanDetailsPage({ params }: PageProps<"/plans/[id]">) {
  const { id } = await params;
  const plan = await getPlan(id).catch(() => null);
  if (!plan) notFound();
  const signedIn = Boolean(getSessionCookie(await headers()));
  // Only for the join step — so it can prefill rather than re-ask onboarding's answers.
  const me = signedIn && !plan.isAttending && !plan.isHost ? await getMe().catch(() => null) : null;

  const art = planArt(plan.category, plan.imageUrl);
  const { composition: mix } = plan;
  const crewCount = mix.total;
  const returning = mix.returning;
  const firstTimers = mix.firstTimers;

  const vibeReasons = [
    { Icon: Music2, tone: "bg-primary", text: `${plan.vibeTags.length} vibe tags match what you're into` },
    { Icon: Sparkles, tone: "bg-secondary", text: `${crewCount} people going you haven't met yet` },
    { Icon: ShieldCheck, tone: "bg-accent", text: `Host rated ★ ${plan.host.trustScore.toFixed(1)} across previous nights` },
    { Icon: UsersRound, tone: "bg-muted", text: `${returning} returning members vouch for this host` },
  ];

  return (
    <div className="pb-24">
      <div className="relative h-[360px] border-b-2 border-foreground md:h-[480px]">
        <Image
          src={art.image}
          alt={`${plan.title} in ${plan.neighborhood}`}
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent" />
        {plan.isHost && <CoverPicker planId={plan.id} />}
        <div className="absolute bottom-6 left-5 text-background md:left-10">
          <Pill tone="orange">{formatWhen(plan.startsAt)}</Pill>
          <h1 className="mt-4 text-5xl uppercase leading-none md:text-7xl truncate max-w-xs md:max-w-6xl">{plan.title}</h1>
          <p className="mt-3 flex items-center gap-2 font-mono text-sm font-bold">
            <MapPin className="size-4" /> {plan.neighborhood}
            {!plan.exactAddress && " · exact address after approval"}
          </p>
        </div>
      </div>

      {(plan.isAttending || plan.isHost) && (
        <Link
          href={`/plans/${plan.id}/room`}
          className="group flex flex-wrap items-center justify-between gap-4 border-b-2 border-foreground bg-secondary px-5 py-5 text-secondary-foreground md:px-10"
        >
          <div>
            <p className="meta-label">You&apos;re in &#10003;</p>
            <h2 className="mt-1 text-2xl uppercase leading-none md:text-3xl">
              {plan.isHost ? "Your party room is open" : "The party room is open"}
            </h2>
            <p className="mt-2 text-sm">
              Meet the crew, get the address, and see the photos afterwards.
            </p>
          </div>
          <span className="inline-flex h-12 items-center gap-2 border-2 border-foreground bg-background px-6 font-bold uppercase text-foreground shadow-stamp transition-transform group-hover:-translate-y-0.5">
            Open party room <ChevronRight className="size-4" />
          </span>
        </Link>
      )}

      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-10 lg:grid-cols-[1fr_340px] lg:px-8">
        <div className="space-y-12">
          <section>
            <SectionTitle kicker="No dress code. Good energy only." title="The vibe" />
            <div className="flex flex-wrap gap-2">
              {plan.vibeTags.map((tag, i) => (
                <Pill key={tag} tone={i === 0 ? "orange" : "plain"}>
                  {tag}
                </Pill>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle kicker="No mystery percentages" title="Why you might vibe" />
            <div className="grid gap-3 sm:grid-cols-2">
              {vibeReasons.map(({ Icon, tone, text }) => (
                <div key={text} className="paper-card flex items-center gap-4 p-4">
                  <span
                    className={`${tone} flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-foreground`}
                  >
                    <Icon className="size-5" />
                  </span>
                  <strong>{text}</strong>
                </div>
              ))}
            </div>
          </section>

          {(plan.hasStarted || plan.memories.length > 0 || plan.hiddenMemories > 0) && (
            <section>
              <SectionTitle
                kicker={
                  plan.status === "COMPLETED" ? "It happened" : "How the night went"
                }
                title="Memories"
              />
              <MemoryGallery
                planId={plan.id}
                memories={plan.memories}
                // Uploading is for people who were actually there. Everyone
                // else gets the host's published photos and a locked count.
                canUpload={plan.isAttending}
                hidden={plan.hiddenMemories}
              />
              {!plan.viewerSignedIn && plan.hiddenMemories > 0 && (
                <PaperCard className="mt-5 flex flex-wrap items-center justify-between gap-4 p-5">
                  <div>
                    <p className="font-bold">
                      {plan.hiddenMemories} more {plan.hiddenMemories === 1 ? "photo" : "photos"}{" "}
                      from this night.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      The album belongs to the people who were there.
                    </p>
                  </div>
                  <Button href="/sign-up" size="sm">
                    Join Baithak
                  </Button>
                </PaperCard>
              )}
            </section>
          )}

          <section>
            <SectionTitle
              kicker={`${crewCount} / ${plan.capacity} attending`}
              title="The crew"
            />
            <div className="mb-5 flex flex-wrap gap-2">
              {mix.women > 0 && <Pill>&#9792; {mix.women} women</Pill>}
              {mix.men > 0 && <Pill>&#9794; {mix.men} men</Pill>}
              {mix.nonBinary > 0 && <Pill>{mix.nonBinary} non-binary</Pill>}
              {mix.undisclosed > 0 && <Pill>{mix.undisclosed} not shared</Pill>}
              <Pill>&#8635; {returning} returning</Pill>
              <Pill>&#127381; {firstTimers} first-timers</Pill>
            </div>
            {!plan.viewerSignedIn && (
              <PaperCard className="mb-4 flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-bold">
                    {crewCount} {crewCount === 1 ? "person is" : "people are"} going.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Sign in to see who they are — we don&apos;t show guests publicly.
                  </p>
                </div>
                <Button href="/sign-up" size="sm">
                  See who&apos;s going
                </Button>
              </PaperCard>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {plan.crew.map((member, i) => (
                <div key={member.user.id} className="paper-card p-4">
                  <div className="flex gap-4">
                    <Avatar name={member.user.name} image={member.user.image} index={i} />
                    <div className="min-w-0">
                      <h3 className="text-lg uppercase">{member.user.name}</h3>
                      <p className="text-sm">
                        {[member.user.age, member.user.city].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className="ml-auto font-mono text-sm font-bold">
                      ★ {member.user.trustScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-4">
                    <Pill tone={member.role === "HOST" ? "orange" : "plain"}>
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
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="paper-card p-5">
            <p className="meta-label text-primary">Your host</p>
            <div className="mt-4 flex items-center gap-4">
              <Avatar name={plan.host.name} image={plan.host.image} size="lg" />
              <div>
                <h2 className="text-2xl uppercase">{plan.host.name}</h2>
                <p className="font-mono text-sm font-bold">
                  ★ {plan.host.trustScore.toFixed(1)}
                </p>
              </div>
            </div>
            {plan.host.bio && <p className="mt-5">{plan.host.bio}</p>}
            <div className="mt-5 space-y-2 border-t-2 border-foreground pt-4 text-sm font-bold">
              <p className="flex gap-2">
                <Check className="size-4 text-accent" /> Phone verified
              </p>
              <p className="flex gap-2">
                <Check className="size-4 text-accent" /> Community history
              </p>
            </div>
          </div>

          {plan.groupHealth.length > 0 && (
            <div className="paper-card bg-accent p-5">
              <p className="meta-label">Group health</p>
              <ul className="mt-2 space-y-1.5">
                {plan.groupHealth.map((note) => (
                  <li key={note} className="font-bold">
                    {note}
                  </li>
                ))}
              </ul>
              {plan.isHost && plan.crowd && (
                <p className="mt-3 text-xs">
                  Your target: {plan.crowd.targetWomen ?? 0} women · {plan.crowd.targetMen ?? 0} men
                  {plan.crowd.ageMin && ` · ages ${plan.crowd.ageMin}-${plan.crowd.ageMax}`}
                </p>
              )}
            </div>
          )}

          {!plan.isAttending && !plan.isHost && (
            <PaperCard className="p-5">
              <h2 className="text-2xl uppercase">Want in?</h2>
              <div className="mt-4">
                {signedIn ? (
                  <RequestToJoin
                    planId={plan.id}
                    planTitle={plan.title}
                    requiredOfGuests={plan.requiredOfGuests}
                    profile={me ?? undefined}
                    questions={plan.rsvpQuestions}
                    houseRules={plan.houseRules}
                  />
                ) : (
                  // A forwarded link reaches people with no account; the form
                  // would only 401. ?next= brings them back here after onboarding.
                  <>
                    <p className="text-sm">Hosts pick their crew from Baithak profiles. Make yours to ask in.</p>
                    <Button href={`/sign-up?next=/plans/${plan.id}`} className="mt-4 w-full">
                      Join Baithak to join this party
                    </Button>
                  </>
                )}
              </div>
            </PaperCard>
          )}

          <div className="paper-card p-5">
            <p className="meta-label text-primary">Where</p>
            <p className="mt-2 font-bold">{plan.neighborhood}</p>
            {plan.exactAddress ? (
              <p className="mt-2 text-sm">{plan.exactAddress}</p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Exact address is shared once the host accepts you.
              </p>
            )}
          </div>

          {plan.isHost && (
            <div className="paper-card p-5">
              <p className="meta-label text-primary">Your plan</p>
              <div className="mt-4">
                <HostPlanControls
                  planId={plan.id}
                  status={plan.status}
                  hasStarted={plan.hasStarted}
                  confirmedGuests={plan.crew.filter((m) => m.role === "GUEST").length}
                />
              </div>
            </div>
          )}

          <SharePlan planId={plan.id} title={plan.title} />

          {plan.viewerSignedIn && (
            <div className="border-t-2 border-foreground/20 pt-5">
              <PlanSafety
                planId={plan.id}
                hostId={plan.host.id}
                isAttending={plan.isAttending}
                isHost={plan.isHost}
              />
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            <LockKeyhole className="mr-1 inline size-3" /> Your exact location stays private too.
          </p>
        </aside>
      </div>
    </div>
  );
}
