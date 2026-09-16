import type { NextRequest } from "next/server";

// ponytail: no real auth yet — reads a header the frontend sets, defaulting
// to a seeded user, so Request to Join / address reveal have someone to act
// as. Swap for Clerk's session user id when auth is wired up.
export function getCurrentUserId(request: NextRequest): string {
  return request.headers.get("x-user-id") ?? "user_seed_ananya";
}
