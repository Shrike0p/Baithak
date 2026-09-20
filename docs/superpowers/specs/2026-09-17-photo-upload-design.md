# Photo upload — design

**Date:** 2026-09-17
**Status:** approved, not yet implemented

## Problem

Everything around party photos already exists: the `Photo` table, the Memories
tab that renders it Polaroid-style, and seeded rows pointing at external URLs.
The only missing piece is getting bytes off a phone and into a URL — see
`ROADMAP.md` Milestone 4.

## Storage decision: Supabase Storage

Chosen over Cloudflare R2, Vercel Blob and GCS, for one reason that overrides
the cost comparison: **Supabase's free plan needs no card on file, so it cannot
generate a surprise bill.** No provider offers a true hard spending cap —
Cloudflare has budget alerts that notify but never pause, and AWS and GCP are
the same. A plan with no payment method is a hard cap by construction.

Accepted limits: 1 GB storage (~600–900 downscaled photos), 5 GB egress/month,
and free projects pause after a week of inactivity.

R2 remains the upgrade path if egress becomes the constraint — it has free
egress and is S3-compatible. Because all storage access sits behind one small
module, that swap is a one-file change.

This supersedes nothing in ROADMAP.md, which already named Supabase.

Storage only: the database stays local Postgres for now.

## Flow

Proxying bytes through `apps/api` is not viable — Vercel caps function request
bodies at 4.5 MB and phone photos exceed that. So:

1. Browser downscales to max 2000px JPEG q0.82 via canvas. Fixes HEIC not
   rendering in browsers, cuts storage, costs nothing server-side.
2. `POST /api/uploads` with `{kind, planId?}`. The API authorizes, then returns
   a short-lived signed upload URL scoped to one exact object key.
3. Browser PUTs the file straight to Supabase Storage, authenticating with the
   signed token alone — the service key never leaves the API.
4. Browser confirms to the owning resource, which writes the database row.

Steps 2 and 4 are separate because a browser can die mid-upload. The server
derives the public URL from the key it issued rather than trusting a URL from
the client — otherwise a caller could point a `Photo` row at any URL.

## Authorization

| kind | object key | who may request it |
|---|---|---|
| `memory` | `memories/<planId>/<cuid>.jpg` | confirmed attendee of that plan |
| `avatar` | `avatars/<userId>.jpg` | the user themselves |
| `cover` | `covers/<planId>.jpg` | that plan's host |

Confirm endpoints: `POST /api/plans/[id]/photos`, `PATCH /api/me`,
`PATCH /api/plans/[id]`.

Deletion: `DELETE /api/photos/[id]`, permitted to the uploader or the plan's
host. Removes the row and the stored object. Chosen over uploader-only because
a trust-first product cannot leave a host unable to take down something in
their own party's album. People pictured in a photo cannot remove it — that
needs tagging, which is out of scope.

## Abuse limits

Enforced in the presign endpoint, the single choke point:

- bucket-level `file_size_limit` of 5 MB, rejected by storage itself. Supabase
  signed upload tokens cannot carry a content-length constraint the way an S3
  presign can, so the bucket setting is the enforcement point
- per-user rate limit on presign requests
- cap on photos per plan
- confirmed attendees only (above)

## Verified by probe (2026-09-17)

`POST /storage/v1/object/upload/sign/<bucket>/<key>` with the service key
returns a token; a plain `PUT` with that token uploads; the object is then
readable at `/storage/v1/object/public/<bucket>/<key>`. All three are plain
HTTP, so **`@supabase/supabase-js` is not needed** — no new dependency.

The token encodes the exact object path and `upsert: false`, so a client cannot
retarget it at another key or overwrite an existing object. It expires in 2
hours, which is Supabase's default.

## Schema

No migration. `Photo` is complete, `User.image` exists, and `Plan.imageUrl`
already carries the comment "host uploads once blob storage exists".

## Known behaviour: deleted photos linger in CDN cache

Supabase serves public objects through a CDN, so a deleted photo stays
fetchable by its direct URL for a while after the object is gone. It vanishes
from every screen immediately, and the key is a UUID nobody can guess, so this
is a cache artifact rather than an exposure. If photo deletion ever needs to be
immediate and total, the bucket has to become private with signed read URLs.

## Not building

- Reconciliation of objects orphaned when a browser abandons an upload between
  steps 3 and 4. A storage lifecycle rule is the fix if it ever matters; a
  `ponytail:` comment will mark it.
- Photo tagging, report button, server-side thumbnails, video.

## Testing

No test runner exists in this repo yet. Add Vitest to `apps/api` and cover the
authorization matrix only — that is where a bug means someone reads or writes
another party's photos.

## Sequencing

Memories end-to-end first. Avatar and cover then reuse the finished path.
