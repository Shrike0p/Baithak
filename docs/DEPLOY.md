# Deploying Baithak

Domain: **baithak.buzz**. Two Vercel projects (web and api) plus Supabase for
Postgres and file storage. Everything below fits inside free tiers.

Read the cost and limit reasoning in [`ROADMAP.md`](ROADMAP.md) Milestone 5.

## 1. Supabase

The storage bucket already exists; the database doesn't.

1. In the same Supabase project, note **Project Settings → Database** and copy
   both connection strings:
   - **Transaction pooler**, port `6543` → `DATABASE_URL`, with
     `?pgbouncer=true&connection_limit=1` appended
   - **Direct connection**, port `5432` → `DIRECT_URL`

   Both are needed. Serverless functions each open their own connection and
   exhaust Postgres quickly, so normal queries go through the pooler — but
   migrations can't run through a transaction pooler, hence the direct URL.

2. Push the schema:

   ```bash
   DATABASE_URL="<direct url>" DIRECT_URL="<direct url>" \
     pnpm --filter @baithak/db db:deploy
   ```

3. **Storage → memories → CORS**: add `https://baithak.buzz` alongside
   localhost, or uploads fail in production with an opaque CORS error.

Free plan caveats worth knowing: **no backups**, and the project **pauses after
a week of inactivity** — which will happen before launch, when nobody is using
it. Unpause from the dashboard.

## 2. Vercel — the API

New project from this repo, root directory `apps/api`.

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase pooler URL (6543) |
| `DIRECT_URL` | Supabase direct URL (5432) |
| `BETTER_AUTH_SECRET` | fresh — `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `https://baithak.buzz` |
| `SUPABASE_URL` | your project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | the service key |
| `SUPABASE_BUCKET` | `memories` |

The API validates sessions against the same database, so its
`BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` must match the web app's exactly.
It does **not** get the Google credentials — `packages/auth` registers the
provider only when they're present, and the API has no business holding an
OAuth secret.

Domain: `api.baithak.buzz`.

## 3. Vercel — the web app

New project from this repo, root directory `apps/web`.

| Variable | Value |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | same as the API |
| `BETTER_AUTH_SECRET` | **the same value as the API** |
| `BETTER_AUTH_URL` | `https://baithak.buzz` |
| `API_ORIGIN` | `https://api.baithak.buzz` |
| `SITE_ORIGIN` | `https://baithak.buzz` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | from Google Cloud |

Domains: `baithak.buzz` and `www.baithak.buzz`.

`API_ORIGIN` is read server-side only — the browser calls `/api/*` on
baithak.buzz and Next rewrites it, which is why there is no CORS anywhere in
this codebase.

## 4. Google OAuth

In the Google Cloud Console:

- **Clients → your OAuth client → Authorised redirect URIs**: add
  `https://baithak.buzz/auth/callback/google`. It's `/auth/`, not `/api/auth/`,
  because the web app rewrites everything under `/api/*`.
- **Audience**: the consent screen is in **Testing**, so only listed test users
  can sign in. Publish it, or nobody but your test accounts gets in. For the
  `email profile openid` scopes alone Google doesn't require verification.

## 5. After the first deploy

- Sign up, sign in with Google, create a plan, upload a photo. The photo is the
  one that proves the storage CORS and the service key are both right.
- Seeded accounts don't exist in production; `db:seed` is a development tool.

## Known gaps at launch

- **Email verification is off**, and account linking runs with
  `requireLocalEmailVerified: false` to compensate. Someone who registers your
  email with a password of their choosing gets linked to your Google identity.
  Acceptable while nobody real is using it; a release blocker otherwise. See
  ROADMAP.md.
- **No backups** on the Supabase free plan.
- **No error monitoring** — a production 500 is invisible unless you're reading
  Vercel logs.
- **No rate limiting** on sign-in.
