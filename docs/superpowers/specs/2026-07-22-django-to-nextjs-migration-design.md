# ARKO — Django → Next.js (Vercel) Migration Design

Date: 2026-07-22
Status: Approved (design gate passed — "implement all")

## Goal

Replace the Django REST backend (`backend/`) and the Vite frontend (`frontend/`) with a
single **Next.js App Router** application deployable to **Vercel**, preserving all 15
functional domains. The old Next.js monorepo (Prisma + tRPC + NextAuth) has been restored
from git (`4e1dd2b~1`) and is the foundation; work is mostly reconciling its data model and
API surface with what the Django backend added, plus solving Vercel-incompatibility points.

## Decisions (locked)

- **Repo shape:** Turborepo/pnpm monorepo. Single Vercel project → `apps/web`.
- **Stack:** Next.js 15 App Router · tRPC 11 · NextAuth v5 (credentials + bcrypt) ·
  Prisma 6 · Tailwind v4 · Radix UI.
- **DB:** Neon serverless Postgres via `DATABASE_URL`. Fresh DB + seeds — **no data
  migration** from the existing Django DB.
- **Real-time messaging:** tRPC **polling** (~3–5s refetch). SSE is a documented later
  upgrade, not built now.
- **Uploads/storage:** **Keep S3** — AWS SDK v3 issuing presigned upload/download URLs,
  reusing the existing bucket + credentials. Metadata rows in Postgres.
- **Sequencing:** one spec → one implementation plan covering all 15 domains.
- **Cleanup:** `backend/` (Django) and `frontend/` (Vite) plus Render deploy files
  (`render.yaml`, `Procfile`, `render-build.sh`, `render-env-template.txt`) removed only
  **after** the Next.js app is verified.

## Domains (15) and API status

| Domain | Old tRPC router | Old Prisma model | Action |
|---|---|---|---|
| auth/users | users | User, Account, Session | reconcile (role/status) |
| finance | finance | AccountCategory, Transaction, Budget, SplitShare | add BusinessMetric, MetricHistory, RecurringTransaction |
| tasks | tasks | Task, (Comment) | reconcile; add TaskDependency (M2M) |
| notes | notes | Note | keep |
| reminders | reminders | Reminder | keep |
| messages | messages | Conversation, Participant, Message | keep; add polling; `edited` flag |
| workflows | workflows | Workflow, Execution, Log | keep (old-only, harmless) |
| github | github | — | keep (old-only) |
| comments | — | Comment (task-only) | **make polymorphic** (resourceType/resourceId) + new router |
| events | — | — | **new** model (Event, Sprint) + router |
| ideas | — | — | **new** model (Idea) + router |
| journal | — | — | **new** model (JournalEntry) + router |
| notifications | — | — | **new** model (Notification) + router |
| resources | — | — | **new** model (Resource) + router |
| storage/uploads | — | — | **new** model (FileAttachment) + S3 router |

## Data model reconciliation notes

- IDs stay Prisma `cuid()` strings (old convention). Django used ints; since it's a fresh
  DB there is no cross-mapping to preserve. `Idea.spawnedTaskId` becomes a nullable
  `String?` FK-style reference (not enforced relation) to match Django's loose link.
- `Comment` becomes polymorphic: `resourceType String`, `resourceId String`, drop the
  task-only FK (keep an index on `[resourceType, resourceId]`).
- New enums mapped from Django choices: idea status, journal mood, notification type,
  resource type, event/sprint colors are plain strings.
- `User` gains no new fields (Django's `image/phone/title/role/status` already present).

## API layer pattern

Each domain = one tRPC router in `apps/web/src/server/api/routers/<domain>.ts` following
the existing `notes.ts` template: `protectedProcedure` for auth, `ctx.prisma` for DB,
`ctx.user.id` for ownership, Zod input validation, ownership/`requireRole` guards from
`trpc.ts`. All routers wired in `root.ts`. This replaces every Django DRF viewset.

## Auth

NextAuth v5 credentials provider (email + bcrypt), Prisma adapter, JWT session carrying
`role`/`status` for RBAC (`lib/rbac.ts`, `requireRole`). Register route already present
(`api/auth/register`). Replaces DRF SimpleJWT.

## Vercel-incompatibility resolutions

1. **WebSockets → polling.** Messages router exposes `list`/`send`/`markRead`; client
   `useQuery` with `refetchInterval`. No persistent connections.
2. **S3 uploads.** `storage` router: `createUploadUrl` (presigned PUT), `confirm` (write
   `FileAttachment` row), `getDownloadUrl` (presigned GET). AWS SDK v3. Env:
   `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`.
3. **Neon Postgres.** `DATABASE_URL` (pooled connection string). `prisma migrate deploy`
   in build; `prisma generate` postinstall.

## Deploy

`apps/web/vercel.json` (restored) tuned for monorepo root = `apps/web`. Vercel env:
`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL`, AWS S3 vars. Remove Render
files in cleanup.

## Success criteria (verification)

1. `pnpm install` + `pnpm build` succeed at repo root.
2. `pnpm db:migrate` applies schema to Neon.
3. App runs locally (`pnpm dev`) and deploys to Vercel.
4. Login works; create/read/update/delete works in **all 15 domains** against Postgres.
5. S3 presigned upload + download works.
6. Messaging updates via polling.
7. Only then: delete `backend/` and `frontend/` and Render files.

## Out of scope

- Migrating existing Django data into Neon.
- WebSocket parity beyond polling.
- New features beyond current Django + old-Next parity.

## Prerequisites needing the user (external, cannot self-provision)

- Neon Postgres database + `DATABASE_URL`.
- Vercel project link + env vars.
- S3 bucket + AWS credentials (existing).
- `AUTH_SECRET` (`openssl rand -base64 32`).

## AGENTS.md compliance

`node_modules/next/dist/docs/` must be read **after** `pnpm install` and **before** writing
Next.js-version-specific code (this is "NOT the Next.js you know").
