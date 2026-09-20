# Baithak

You don't need a squad to have plans.

Baithak helps people find trusted small-group social plans — house parties, drinks, dinners, game nights — and meet the crew before they turn up. Starting with Bangalore.

Turborepo monorepo: frontend and backend apps side by side, sharing types, config and the database client.

## Structure

```
apps/
  web/     Next.js 16 frontend (App Router, Tailwind v4) — port 3000
  api/     Next.js 16 backend, route handlers only        — port 3001
packages/
  db/                Prisma schema + client (@baithak/db)
  types/             Shared domain types (@baithak/types)
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

pnpm --filter @baithak/db db:migrate    # apply migrations
pnpm --filter @baithak/db db:seed       # fake users, plans, photos

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

pnpm --filter @baithak/db db:studio  # browse the database
pnpm --filter @baithak/db db:generate # regenerate the Prisma client
```

## Signing in

Auth is self-hosted (Better Auth, email + password, sessions in Postgres). The seed
creates real accounts — sign in as any seeded user:

```
ananya@seed.local   (hosts a plan with 6 people waiting)
prakhar@seed.local  sara@seed.local  rahul@seed.local  …
password: scene1234
```

Set `BETTER_AUTH_SECRET` in `packages/db/.env`, `apps/web/.env.local` and
`apps/api/.env.local` — it must match across all three.

## Notes

Email verification is disabled until an email provider is wired up. See
`docs/ROADMAP.md` for what's built and what's next.
