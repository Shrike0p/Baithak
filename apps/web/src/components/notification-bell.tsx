"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import type { Notification } from "@/lib/api";

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

/**
 * The bell opens the list in place rather than navigating away.
 *
 * Checking what happened shouldn't cost you the page you were on — most
 * notifications are read and dismissed, and only some are worth following.
 *
 * Items load on first open, not on every page render: the unread count comes
 * down with the layout, so a closed bell costs nothing.
 */
export function NotificationBell({ unread }: { unread: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointer(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || items) return;
    let live = true;
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => live && setItems(d.items ?? []))
      .catch(() => live && setItems([]));
    return () => {
      live = false;
    };
  }, [open, items]);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setItems((prev) => prev?.map((n) => ({ ...n, readAt: new Date().toISOString() })) ?? null);
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className="relative flex size-9 items-center justify-center border-2 border-foreground bg-card"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-2 -top-2 flex min-w-5 items-center justify-center rounded-full border-2 border-foreground bg-primary px-1 font-mono text-[10px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto border-2 border-foreground bg-background shadow-stamp-lg">
          <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-3">
            <p className="meta-label">{unread > 0 ? `${unread} new` : "All caught up"}</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground"
              >
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            )}
          </div>

          {items === null ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="font-bold">Nothing yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Requests, acceptances and changes land here.
              </p>
            </div>
          ) : (
            <ul className="divide-y-2 divide-foreground/10">
              {items.slice(0, 8).map((n) => {
                const inner = (
                  <div className={`flex gap-3 px-4 py-3 ${n.readAt ? "" : "bg-paper"}`}>
                    <span
                      className={`mt-1.5 size-2.5 shrink-0 rounded-full border-2 border-foreground ${
                        n.readAt ? "bg-transparent" : TONE[n.kind] ?? "bg-primary"
                      }`}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold">{n.title}</p>
                      {n.body && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{n.body}</p>
                      )}
                      <p className="meta-label mt-1 text-muted-foreground">{ago(n.createdAt)}</p>
                    </div>
                  </div>
                );

                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link href={n.href} onClick={() => setOpen(false)} className="block hover:bg-muted">
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

          {items && items.length > 8 && (
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block border-t-2 border-foreground px-4 py-3 text-center font-mono text-xs font-bold uppercase hover:bg-muted"
            >
              See all {items.length}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
