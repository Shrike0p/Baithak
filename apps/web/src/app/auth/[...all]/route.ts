import { auth } from "@baithak/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Mounted at /auth rather than /api/auth: next.config.ts rewrites all of
// /api/* to apps/api, which would otherwise swallow these routes.
export const { GET, POST } = toNextJsHandler(auth);
