import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getMe, getNotifications } from "@/lib/api";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Fetched here rather than in the client shell so the sidebar renders with
  // the right name and profile strength on first paint, not after a flash.
  const [me, notifications, requestHeaders] = await Promise.all([
    getMe().catch(() => null),
    getNotifications().catch(() => ({ unread: 0 })),
    headers(),
  ]);

  // An account with no profile can apply to plans and arrives in the host's
  // queue with every field blank, gets passed over, and never learns why. The
  // client-side push after sign-up was easy to walk around — and a social
  // sign-in skips it entirely, since there's no form to finish.
  const pathname = requestHeaders.get("x-pathname") ?? "";
  if (me && !me.onboardedAt && !pathname.startsWith("/onboarding")) {
    const next = pathname && pathname !== "/discover" ? `?next=${encodeURIComponent(pathname)}` : "";
    redirect(`/onboarding${next}`);
  }
  return (
    <AppShell me={me} unread={notifications.unread}>
      {children}
    </AppShell>
  );
}
