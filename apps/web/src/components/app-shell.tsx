"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  CalendarDays,
  Compass,
  MapPin,
  Menu,
  Plus,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui";
import { AccountMenu } from "@/components/account-menu";
import { NotificationBell } from "@/components/notification-bell";
import type { Me } from "@/lib/api";

const NAV = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/plans", label: "Plans", icon: CalendarDays },
  { href: "/people", label: "People", icon: UsersRound },
];

export function AppShell({
  children,
  me,
  unread = 0,
}: {
  children: ReactNode;
  me: Me | null;
  /** Real count — the dot used to be hardcoded, so it was always lit. */
  unread?: number;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[230px_minmax(0,1fr)]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[230px] flex-col border-r-2 border-foreground bg-background p-5 transition-transform md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-10 flex items-center justify-between">
          <Logo href="/discover" />
          <button
            className="md:hidden"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          >
            <X />
          </button>
        </div>

        <nav className="space-y-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex w-full items-center gap-3 border-2 px-3 py-2.5 text-left font-bold transition-all ${
                isActive(item.href)
                  ? "translate-x-1 border-foreground bg-primary text-primary-foreground shadow-stamp-sm"
                  : "border-transparent hover:border-foreground hover:bg-card"
              }`}
            >
              <item.icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="my-6 border-t-2 border-foreground" />

        <Link
          href="/plans/new"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-sm border-2 border-foreground bg-primary font-bold uppercase text-primary-foreground shadow-stamp transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-stamp-lg active:translate-x-0.5 active:translate-y-0.5"
        >
          <Plus className="size-4" /> Make a plan
        </Link>

        <Link
          href="/host"
          className={`mt-3 flex items-center gap-3 border-2 px-3 py-2.5 text-left font-bold ${
            isActive("/host")
              ? "border-foreground bg-secondary text-secondary-foreground"
              : "border-transparent hover:border-foreground"
          }`}
        >
          <Sparkles className="size-5" /> Host desk
        </Link>

        <div className="mt-auto border-t-2 border-foreground pt-4">
          {me ? (
            <AccountMenu name={me.name} email={me.email} image={me.image} strength={me.strength} />
          ) : (
            <Link
              href="/sign-up"
              className="inline-flex h-11 w-full items-center justify-center rounded-sm border-2 border-foreground bg-primary font-bold uppercase text-primary-foreground shadow-stamp-sm"
            >
              Join Baithak
            </Link>
          )}
        </div>
      </aside>

      <div className="min-w-0 md:col-start-2">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b-2 border-foreground bg-background/95 px-4 backdrop-blur-sm md:px-8">
          <button className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu />
          </button>
          <div className="hidden items-center gap-2 md:flex">
            <MapPin className="size-4 text-primary" />
            <span className="meta-label">Bangalore · Your people</span>
          </div>
          <Logo compact href="/discover" />
          <div className="flex gap-2">
            <NotificationBell unread={unread} />
          </div>
        </header>

        <main>{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t-2 border-foreground bg-background md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex h-16 flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase ${
              isActive(item.href) ? "bg-primary text-primary-foreground" : ""
            }`}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        ))}
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-16 flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase"
        >
          <Menu className="size-5" />
          More
        </button>
      </nav>
    </div>
  );
}
