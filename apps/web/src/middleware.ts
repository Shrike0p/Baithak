import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * /plans/<id> and its generated OG image — nothing deeper.
 *
 * Next appends a build hash to the image segment ("opengraph-image-1gmbiz"),
 * so this matches the prefix rather than the exact name; an exact match sends
 * every crawler to the sign-in page instead of the ticket.
 */
function isPublicPlan(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "plans" || parts.length < 2) return false;
  if (parts[1] === "new") return false;
  return (
    parts.length === 2 ||
    (parts.length === 3 &&
      (parts[2].startsWith("opengraph-image") || parts[2].startsWith("twitter-image")))
  );
}

/**
 * Optimistic gate only — it checks that a session cookie exists, not that it's
 * valid, because middleware shouldn't hit the database on every request. Real
 * enforcement happens in apps/api, which resolves the session properly and
 * returns 401 when it can't.
 */
/**
 * Server components can't see the current path, and the app layout needs it to
 * decide whether someone still owes us an onboarding. Passing it as a request
 * header is the supported way to hand it down.
 */
function withPathname(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export function middleware(request: NextRequest) {
  const signedIn = Boolean(getSessionCookie(request));

  // The landing page is a pitch to strangers. Someone already signed in who
  // lands on "/" — via the logo, a bookmark, or back-navigation — would see
  // "I have an account" CTAs and reasonably conclude they'd been logged out.
  if (request.nextUrl.pathname === "/") {
    return signedIn
      ? NextResponse.redirect(new URL("/discover", request.url))
      : withPathname(request);
  }

  if (signedIn) return withPathname(request);

  // Browsing is public. Plans are hosts advertising to strangers, and someone
  // who can't see what's on offer has no reason to sign up — the gate used to
  // sit in front of the entire funnel.
  //
  // Everything that names or exposes a *guest* stays private: /plans is your
  // own commitments, /new is an action, /room is the party itself.
  if (request.nextUrl.pathname === "/discover") return withPathname(request);
  if (isPublicPlan(request.nextUrl.pathname)) return withPathname(request);

  const signIn = new URL("/sign-in", request.url);
  signIn.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(signIn);
}

// Hosts are public, guests are private — the split in ROADMAP.md §2.5. The
// landing page and a single plan read without an account, because both are a
// host advertising to strangers. Everything that names or exposes a guest
// stays behind sign-in, and a signed-out visitor inside the app shell would
// only see a sidebar of dead links anyway.
//
// Deep links still work — middleware stashes the path in ?next=, so someone who
// follows a shared plan link lands on it right after signing up.
export const config = {
  matcher: [
    "/",
    "/discover/:path*",
    "/plans/:path*",
    "/people/:path*",
    "/host/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/notifications/:path*",
    "/onboarding/:path*",
  ],
};
