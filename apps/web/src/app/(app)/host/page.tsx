import { getMyPlans, getApplicants } from "@/lib/api";
import { ApplicantDesk } from "@/components/applicant-desk";
import { Button, PaperCard } from "@/components/ui";
import { HostPlanSwitcher } from "@/components/host-plan-switcher";

export default async function HostDeskPage({ searchParams }: PageProps<"/host">) {
  const { plan: planParam } = await searchParams;
  const { hosting } = await getMyPlans();

  if (hosting.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-20 text-center">
        <p className="meta-label text-primary">Host desk</p>
        <h1 className="mt-3 text-5xl uppercase md:text-7xl">No one&apos;s knocking… yet.</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          You aren&apos;t hosting anything right now. Put a plan out there and requests land here.
        </p>
        <Button href="/plans/new" className="mt-8">
          Make a plan
        </Button>
      </div>
    );
  }

  // Default to whichever plan people are actually waiting on, not just the first.
  const busiest = [...hosting].sort(
    (a, b) => b.pendingApplications - a.pendingApplications
  )[0];
  const selectedId =
    typeof planParam === "string" && hosting.some((p) => p.id === planParam)
      ? planParam
      : busiest.id;

  const queue = await getApplicants(selectedId).catch(() => null);

  const waiting =
    queue?.applications.filter((a) => a.status === "PENDING" || a.status === "REVIEW_LATER")
      .length ?? 0;

  return (
    // On desktop the desk is a fixed-height workspace: only the panes scroll,
    // never the page. 4rem is the app shell's sticky header. Below lg it just
    // flows normally.
    <div className="lg:flex lg:h-[calc(100vh-4rem)] lg:flex-col">
      {/* Kept short on purpose: on desktop every line here comes out of the
          applicant panes below, which are the actual work. */}
      <div className="border-b-2 border-foreground px-5 py-4 md:px-8 lg:shrink-0">
        <p className="meta-label text-primary">
          {queue?.plan.title} · {queue?.plan.neighborhood} · We&apos;ve sorted the crowd, you make the call
        </p>
        <h1 className="mt-1 text-3xl uppercase md:text-4xl">
          {waiting === 0 ? "Nobody waiting." : `${waiting} ${waiting === 1 ? "person wants" : "people want"} in.`}
        </h1>

        {hosting.length > 1 && <HostPlanSwitcher plans={hosting} selectedId={selectedId} />}
      </div>

      {!queue ? (
        <PaperCard className="m-8 p-10 text-center">
          <h2 className="text-2xl uppercase">Couldn&apos;t load that queue.</h2>
        </PaperCard>
      ) : (
        <ApplicantDesk queue={queue} />
      )}
    </div>
  );
}
