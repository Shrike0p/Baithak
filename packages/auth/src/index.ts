import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@baithak/db";

/**
 * One auth instance shared by both apps.
 *
 * apps/web serves the handler and signs people in; apps/api validates the
 * session cookie the browser sends through the /api proxy. They must agree on
 * the secret and the database, so this is deliberately not duplicated.
 *
 * Sessions live in Postgres rather than a stateless JWT: apps/api can then
 * check them against the database it already connects to, and revoking a
 * session takes effect immediately.
 */
/**
 * Google is only registered when its credentials are present.
 *
 * Both apps construct this same instance, and apps/api has no business holding
 * an OAuth secret — declaring the provider unconditionally would mean either
 * copying the secret everywhere or booting with a half-configured provider.
 */
const socialProviders =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : undefined;

/** Whether the UI should offer the Google button at all. */
export const googleEnabled = Boolean(socialProviders);

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",

  // Mounted outside /api because apps/web rewrites all of /api/* to apps/api.
  basePath: "/auth",

  session: {
    // Rolling window, the way Figma/Linear/Slack behave: sign in once and you
    // stay signed in as long as you keep turning up. The cookie is persistent
    // (Max-Age, not a browser-session cookie), so quitting the browser doesn't
    // sign you out.
    expiresIn: 60 * 60 * 24 * 60, // 60 days of inactivity before it lapses
    updateAge: 60 * 60 * 24, // touch it at most once a day, then extend
    cookieCache: {
      // Avoids a database read on every single request; the session row stays
      // the source of truth, so revoking still takes effect within the minute.
      enabled: true,
      maxAge: 60,
    },
  },

  ...(socialProviders ? { socialProviders } : {}),

  account: {
    accountLinking: {
      // One account per email. Without this, signing up with a password and
      // later using Google on the same address fails with account_not_linked,
      // which reads as "your account is gone".
      enabled: true,
      // Google verifies the address it hands us, so it's safe to trust the
      // provider side of the match.
      trustedProviders: ["google"],
      // The provider side is trustworthy; the local side isn't, because
      // requireEmailVerification is off below and nothing proves the person
      // who registered an address owns it.
      //
      // SECURITY: this is a deliberate, temporary trade. Someone who registers
      // your email with a password they choose gets silently linked to your
      // Google identity the first time you sign in with it — and their
      // password then opens your account. The hole is unverified signup, not
      // linking; linking only makes it reachable.
      //
      // Acceptable pre-launch with no real users. Turning on email
      // verification closes it, and this flag should go back to its strict
      // default the moment an email provider exists. Tracked in ROADMAP.md as
      // a release blocker.
      requireLocalEmailVerified: false,
    },
  },

  emailAndPassword: {
    enabled: true,
    // Email verification is required in principle (see PRODUCT_PLAN.md §4) but
    // needs an email provider wired up; until then people can sign in directly.
    requireEmailVerification: false,
  },

  user: {
    additionalFields: {
      // Exposed on the session so the app can tell whether to send someone to
      // onboarding without a second query. Never settable by the client.
      onboardedAt: { type: "date", required: false, input: false },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
