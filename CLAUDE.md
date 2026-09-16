# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Before building any product feature (screens, components, data model), read [`docs/PRODUCT_PLAN.md`](docs/PRODUCT_PLAN.md)** — it has the full product brief, design system (palette/typography/copy), the complete screen inventory, and which build phase is currently active. Don't re-derive product decisions that are already resolved there, and don't silently answer the "Open Decisions" it lists — ask instead.

**For what's actually built and what to do next, read [`docs/ROADMAP.md`](docs/ROADMAP.md)** — it's the live build tracker (current state, ordered milestones, and where to start each one). Keep it updated as work lands; `PRODUCT_PLAN.md`'s phase list is the original plan, not current status.

**Before touching the database schema or API contracts, read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** — it has the system diagram, core data flows (discover → apply → accept → party room → reviews), and the full entity/table reference. No migrations exist yet; this doc is the planned shape, not implemented state.

## What this is

Turborepo + pnpm workspace monorepo for **Scene**. Two Next.js 16 apps share code through workspace packages instead of duplicating it:

- `apps/web` — the frontend (App Router, Tailwind v4, port 3000). Design system lives in `src/components/ui.tsx` (DisplayHeading/MetaTag/Badge/Button/FlyerCard) and `globals.css` (`--color-cream/ink/orange/purple/green` tokens, `.flyer-card` border+offset-shadow look). `src/lib/api.ts` is the only place that calls `apps/api`.
- `apps/api` — the backend, Next.js used purely as a route-handler server (port 3001). Routes live in `src/app/api/**/route.ts` and use `@scene/db`'s Prisma client directly.
- `packages/db` — Prisma schema + client (`@scene/db`), currently a **minimal slice** of `docs/ARCHITECTURE.md`'s full schema (`User`, `Plan`, `PlanAttendee`, `Application` only) — add tables here only when the screen/flow that needs them is actually being built, per the phased plan.
- `packages/types` — shared domain types (`User`, `Plan`, `TrustSignal`) imported by both apps as `@scene/types`
- `packages/typescript-config` — shared `tsconfig` bases (`base.json`, `nextjs.json`)

**No real auth yet.** There's no Clerk/session wiring — `apps/api` reads an `x-user-id` header (`getCurrentUserId` in `apps/api/src/lib/current-user.ts`, defaults to a seeded user) to know "who's asking," and `apps/web`'s `CURRENT_USER_ID` constant in `src/lib/api.ts` sends that header on every request. This is a deliberate placeholder — replace both with real Clerk session data when auth is wired up, don't build more features on top of assuming it'll always be this seeded id.

**Local Postgres, not Neon yet.** `packages/db/.env` and `apps/api/.env.local` both point at a local `scene` database (`postgresql://<user>@localhost:5432/scene`) via Homebrew's `postgresql@17` service. Swapping to Neon later is just changing `DATABASE_URL` in both places — no code change.

`apps/api` is deliberately a separate app rather than API routes bolted onto `apps/web`, so the backend can be deployed, scaled, and reasoned about independently. When adding a new backend endpoint, it goes in `apps/api/src/app/api/**/route.ts`, not in `apps/web`.

## Commands

Run from the repo root (pnpm workspace + turbo drive everything; don't `cd` into an app to run its scripts individually except for one-off ad hoc commands):

```bash
brew services start postgresql@17           # local DB must be running (createdb scene if it doesn't exist yet)
pnpm install                                 # install all workspace deps
pnpm --filter @scene/db db:migrate           # apply Prisma migrations (packages/db/prisma/migrations)
pnpm --filter @scene/db db:seed              # seed a couple of fake users/plans
pnpm dev                                     # both apps in parallel (web :3000, api :3001)
pnpm --filter web dev                        # just the frontend
pnpm --filter api dev                        # just the backend
pnpm build                                   # turbo build, respects dependency graph + cache
pnpm lint                                    # turbo lint across all packages
pnpm type-check                              # turbo type-check across all packages
```

Other `@scene/db` scripts: `db:generate` (regenerate the Prisma client after a schema change) and `db:studio` (Prisma's DB browser GUI).

There is no test runner configured yet — `pnpm test` is wired into `turbo.json` but no package defines a `test` script yet. Add one (e.g. Vitest) to the relevant app/package's `package.json` before relying on `pnpm test`.

To add a dependency to a specific app/package, use pnpm's `--filter`, not a bare `pnpm add` from root:

```bash
pnpm --filter web add <package>
pnpm --filter @scene/types add <package>
```

## Architecture notes

- **Two independent Next.js apps, not one app with route groups.** `web` and `api` have separate `package.json`, `next.config.ts`, ports, and deploy lifecycles. Cross-app communication happens over HTTP — `web` reads `NEXT_PUBLIC_API_URL` (see `apps/web/.env.local.example`) to call `api`. Don't import server-only code from `apps/api` directly into `apps/web`; share it via a `packages/*` workspace package instead.
- **Shared types live in `@scene/types`, not duplicated per app.** When a data shape needs to exist on both sides of the wire (e.g. a `Plan` returned by the API and rendered by the web app), add/edit it in `packages/types/src/index.ts` rather than redefining it locally in either app.
- **New shared, non-UI code (validation, constants, API client helpers) should become a new `packages/*` workspace package**, following the pattern of `packages/types`: a `package.json` with `"main"/"types": "./src/index.ts"` (no build step needed since both apps consume it via TS path resolution through the workspace), plus a `tsconfig.json` extending `@scene/typescript-config/base.json`.
- **Turbo task graph** (`turbo.json`): `build`/`lint`/`type-check`/`test` all declare `dependsOn: ["^build"]` or similar, so workspace packages that other packages depend on build/typecheck first. `dev` is uncached and persistent, as expected for long-running dev servers.
- Both apps are on **Next.js 16**, which has breaking changes vs. older Next.js versions you may know from training data (route handler conventions, `LayoutProps<"/">` typed layout props, etc.). Before writing App Router code, check `apps/{web,api}/node_modules/next/dist/docs/` for the version actually installed rather than assuming older Next.js conventions.
- `.agents/skills/` contains third-party design/frontend-taste skills installed via `npx skills add` (tracked in `skills-lock.json`) — these are UI/visual-design guidance skills, not project code; consult them when building screens per `docs/PRODUCT_PLAN.md`, but they don't affect the architecture described above.
