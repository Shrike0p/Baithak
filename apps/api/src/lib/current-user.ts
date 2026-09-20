import type { NextRequest } from "next/server";
import { auth } from "@baithak/auth";

/**
 * The signed-in user, resolved from the Better Auth session cookie the browser
 * sends (directly, or forwarded by apps/web when rendering on the server).
 *
 * Returns null when there's no valid session — callers must treat that as
 * unauthenticated rather than falling back to a default user.
 */
export async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id ?? null;
}
