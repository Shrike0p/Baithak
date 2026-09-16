# Scene

You don't need a squad to have plans.

Scene helps people find trusted small-group social plans — house parties, drinks, dinners, game nights — and meet the crew before they turn up. Starting with Bangalore.

Turborepo monorepo: frontend and backend apps side by side, sharing types, config and the database client.

## Structure

```
apps/
  web/     Next.js 16 frontend (App Router, Tailwind v4) — port 3000
  api/     Next.js 16 backend, route handlers only        — port 3001
packages/
  db/                Prisma schema + client (@scene/db)
  types/             Shared domain types (@scene/types)
  typescript-config/ Shared tsconfig bases
docs/
  PRODUCT_PLAN.md    Product brief, design system, screen inventory
  ARCHITECTURE.md    System diagram, data flows, target schema
  ROADMAP.md         What's built and what's next
```

## Getting started

Requires Node 20+, pnpm, and a local PostgreSQL.

```bash
brew services start postgresql@17     # or your own Postgres
createdb scene

pnpm install
cp apps/web/.env.local.example apps/web/.env.local

pnpm --filter @scene/db db:migrate    # apply migrations
pnpm --filter @scene/db db:seed       # fake users, plans, photos

pnpm dev                              # both apps in parallel
```

- Web: http://localhost:3000
- API: http://localhost:3001 (health check at `/api/health`)

`DATABASE_URL` lives in `packages/db/.env` and `apps/api/.env.local` — both default to a local `scene` database.

## Common commands

```bash
pnpm dev                          # all apps, dev mode
pnpm --filter web dev             # just the frontend
pnpm --filter api dev             # just the backend
pnpm build                        # build everything (turbo, cached)
pnpm lint                         # lint everything
pnpm type-check                   # typecheck everything

pnpm --filter @scene/db db:studio  # browse the database
pnpm --filter @scene/db db:generate # regenerate the Prisma client
```

## Notes

There is no authentication yet — the API reads an `x-user-id` header and defaults to a seeded user. See `docs/ROADMAP.md` for what that blocks and what's planned next.
