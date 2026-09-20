import Link from "next/link";
import { CheckCheck } from "lucide-react";
import { getNotifications } from "@/lib/api";
import { PaperCard, MetaLabel } from "@/components/ui";
import { MarkAllRead } from "@/components/mark-all-read";

const TONE: Record<string, string> = {
  APPLICATION_ACCEPTED: "bg-accent",
  APPLICATION_DECLINED: "bg-muted",
  NEW_APPLICANT: "bg-primary",
  PLAN_CANCELLED: "bg-primary",
  PLAN_WRAPPED: "bg-secondary",
  NEW_PHOTOS: "bg-secondary",
};

function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "JUST NOW";
  if (mins < 60) return `${mins}M AGO`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}H AGO`;
  return `${Math.round(hrs / 24)}D AGO`;
}

export default async function NotificationsPage() {
  const { items, unread } = await getNotifications().catch(() => ({ items: [], unread: 0 }));

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-10 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="meta-label text-primary">
            {unread > 0 ? `${unread} new` : "All caught up"}
          </p>
          <h1 className="mt-3 text-5xl uppercase md:text-6xl">What happened</h1>
        </div>
        {unread > 0 && <MarkAllRead />}
      </div>

      {items.length === 0 ? (
        <PaperCard className="mt-10 p-12 text-center">
          <CheckCheck className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 text-3xl uppercase">Nothing yet.</h2>
          <p className="mt-3 text-muted-foreground">
            Requests, acceptances and changes to your plans land here.
          </p>
        </PaperCard>
      ) : (
        <ul className="mt-10 space-y-3">
          {items.map((n) => {
            const inner = (
              <div
                className={`flex gap-4 border-2 border-foreground p-5 ${
                  n.readAt ? "bg-card" : "bg-paper shadow-stamp-sm"
                }`}
              >
                <span
                  className={`mt-1 size-3 shrink-0 rounded-full border-2 border-foreground ${
                    n.readAt ? "bg-transparent" : TONE[n.kind] ?? "bg-primary"
                  }`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{n.title}</p>
                  {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                  <MetaLabel className="mt-2 block text-muted-foreground">
                    {ago(n.createdAt)}
                  </MetaLabel>
                </div>
              </div>
            );

            return (
              <li key={n.id}>
                {n.href ? (
                  <Link href={n.href} className="block transition-transform hover:-translate-y-0.5">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
