# Scene

Turborepo monorepo for Scene — frontend and backend apps live side by side, sharing types and config.

## Structure

```
apps/
  web/     Next.js 16 frontend (App Router) — port 3000
  api/     Next.js 16 backend, route handlers only — port 3001
packages/
  types/             Shared domain types (User, Plan, TrustSignal, ...)
  typescript-config/ Shared tsconfig bases
```

## Getting started

```bash
pnpm install
cp apps/web/.env.local.example apps/web/.env.local
pnpm dev          # runs both apps in parallel via turbo
```

- Web: http://localhost:3000
- API: http://localhost:3001 (health check at /api/health)

## Common commands

```bash
pnpm dev                       # all apps, dev mode
pnpm --filter web dev          # just the frontend
pnpm --filter api dev          # just the backend
pnpm build                     # build everything (turbo, cached)
pnpm lint                      # lint everything
pnpm type-check                # typecheck everything
```
# Scene
