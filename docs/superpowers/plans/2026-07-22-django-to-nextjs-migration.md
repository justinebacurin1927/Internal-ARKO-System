# ARKO Django → Next.js Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Django REST backend and Vite frontend with a single Vercel-deployable Next.js App Router app (Prisma + tRPC + NextAuth), preserving all 15 functional domains.

**Architecture:** The restored Turborepo monorepo (`apps/web` + `packages/*`) is the base. Reconcile the Prisma schema with Django's data model, add tRPC routers + UI pages for the domains Django added, solve three Vercel-incompatibility points (WebSockets→polling, S3 presigned uploads, Neon Postgres), then delete Django/Vite/Render.

**Tech Stack:** Next.js 15 (App Router) · tRPC 11 · NextAuth v5 (credentials + bcrypt) · Prisma 6 · Tailwind v4 · Radix UI · pnpm + Turborepo · Neon Postgres · AWS S3 (SDK v3).

## Global Constraints

- Package manager: **pnpm@9.12.0**; Node **>=20**. Never use npm/yarn in this repo.
- Prisma model IDs: `String @id @default(cuid())`. Never introduce integer IDs.
- tRPC routers follow the `apps/web/src/server/api/routers/notes.ts` template: `protectedProcedure`, `ctx.prisma`, `ctx.user.id`, Zod input validation, ownership check (`if (row.userId !== ctx.user.id) throw FORBIDDEN`), ADMIN bypass via `requireRole`/`requireOwnership` from `trpc.ts`.
- All new routers registered in `apps/web/src/server/api/root.ts`.
- **AGENTS.md rule:** After `pnpm install`, read `node_modules/next/dist/docs/` before writing Next.js-version-specific code. This is not the Next.js in training data.
- No data migration from Django DB. Fresh DB + seeds.
- Do NOT delete `backend/` or `frontend/` until Phase 7 (after verification).
- Verification per task = `pnpm typecheck` + relevant build/route check (the repo has no test runner; Task 0.2 adds a minimal one for router logic).

---

## Phase 0 — Boot the restored monorepo

### Task 0.1: Install dependencies and confirm the restored app builds

**Files:**
- Modify: none (install only)
- Read after install: `node_modules/next/dist/docs/` (AGENTS.md rule)

**Interfaces:**
- Produces: a working `node_modules`, generated Prisma client `@arko/db`.

- [ ] **Step 1: Install workspace deps**

Run: `pnpm install`
Expected: resolves all workspaces (`apps/web`, `packages/*`), no peer-dep fatal errors.

- [ ] **Step 2: Read the bundled Next.js docs (AGENTS.md compliance)**

Run: `ls node_modules/next/dist/docs/ && ls node_modules/next/dist/docs/*/`
Read the App Router, route-handler, and NextAuth-relevant guides. Note any deprecations vs. code in `apps/web`.

- [ ] **Step 3: Generate Prisma client against current schema**

Run: `pnpm db:generate`
Expected: `@arko/db` client generated, no schema errors.

- [ ] **Step 4: Typecheck the restored app**

Run: `pnpm typecheck`
Expected: may show errors from missing envs only; no missing-module errors. Record remaining errors — they are addressed by later tasks.

- [ ] **Step 5: Commit**

```bash
git add pnpm-lock.yaml
git commit -m "chore: install monorepo deps, generate prisma client"
```

### Task 0.2: Add a minimal test runner for router logic

**Files:**
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/src/server/api/routers/__tests__/smoke.test.ts`
- Modify: `apps/web/package.json` (add `"test": "vitest run"`, devDeps `vitest`, `@vitest/coverage-v8`)

**Interfaces:**
- Produces: `pnpm --filter @arko/web test` runs vitest.

- [ ] **Step 1: Write the failing smoke test**

```ts
// apps/web/src/server/api/routers/__tests__/smoke.test.ts
import { describe, it, expect } from 'vitest'
import { appRouter } from '../../root'

describe('appRouter', () => {
  it('exposes the notes router', () => {
    expect(appRouter._def.procedures).toBeDefined()
    expect(Object.keys(appRouter._def.record)).toContain('notes')
  })
})
```

- [ ] **Step 2: Add vitest config**

```ts
// apps/web/vitest.config.ts
import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { environment: 'node', globals: false } })
```

- [ ] **Step 3: Add deps + script**

Run: `pnpm --filter @arko/web add -D vitest @vitest/coverage-v8`
Then add `"test": "vitest run"` to `apps/web/package.json` scripts.

- [ ] **Step 4: Run the test**

Run: `pnpm --filter @arko/web test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/vitest.config.ts apps/web/src/server/api/routers/__tests__ apps/web/package.json pnpm-lock.yaml
git commit -m "test: add vitest runner + appRouter smoke test"
```

---

## Phase 1 — Schema reconciliation

### Task 1.1: Add Django-only models + finance extras to Prisma schema

**Files:**
- Modify: `packages/db/prisma/schema.prisma` (append models; extend `User` and `Comment`)

**Interfaces:**
- Produces: Prisma models `Event`, `Sprint`, `Idea`, `JournalEntry`, `Notification`, `Resource`, `FileAttachment`, `BusinessMetric`, `MetricHistory`, `RecurringTransaction`; `Comment` becomes polymorphic; `User` gains back-relations.

- [ ] **Step 1: Make `Comment` polymorphic**

Replace the existing `Comment` model with:

```prisma
model Comment {
  id           String   @id @default(cuid())
  content      String
  edited       Boolean  @default(false)
  userId       String
  resourceType String   // 'TASK' | 'NOTE' | 'IDEA' ...
  resourceId   String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([resourceType, resourceId])
}
```

Remove `comments Comment[]` from the `Task` model (Comment is no longer task-FK'd).

- [ ] **Step 2: Append new domain models**

```prisma
// ===== EVENTS / SPRINTS =====
model Event {
  id          String   @id @default(cuid())
  title       String
  description String?
  date        DateTime
  endDate     DateTime?
  startTime   String
  endTime     String
  color       String   @default("#2D6A4F")
  userId      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Sprint {
  id        String   @id @default(cuid())
  name      String
  goal      String?
  startDate DateTime
  endDate   DateTime
  color     String   @default("#2D6A4F")
  isActive  Boolean  @default(true)
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ===== IDEAS =====
model Idea {
  id            String   @id @default(cuid())
  title         String
  description   String?
  status        String   @default("IDEA")   // IDEA | EXPLORING | VALIDATED | ARCHIVED
  tags          String[] @default([])
  spawnedTaskId String?
  userId        String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ===== JOURNAL =====
model JournalEntry {
  id        String   @id @default(cuid())
  title     String
  content   String?
  mood      String?
  date      DateTime @default(now())
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ===== NOTIFICATIONS =====
model Notification {
  id        String   @id @default(cuid())
  notifType String
  title     String
  message   String?
  link      String?
  read      Boolean  @default(false)
  userId    String
  createdAt DateTime @default(now())
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, read])
}

// ===== RESOURCES =====
model Resource {
  id           String   @id @default(cuid())
  title        String
  url          String?
  resourceType String   @default("LINK")  // LINK | FILE | DOC
  description  String?
  tags         String[] @default([])
  fileId       String?
  userId       String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ===== STORAGE (S3) =====
model FileAttachment {
  id           String   @id @default(cuid())
  userId       String
  resourceType String
  resourceId   String?
  fileKey      String
  fileName     String
  fileSize     Int      @default(0)
  mimeType     String   @default("application/octet-stream")
  createdAt    DateTime @default(now())
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([resourceType, resourceId])
}

// ===== FINANCE EXTRAS =====
model BusinessMetric {
  id          String   @id @default(cuid())
  userId      String
  key         String
  name        String
  value       Float    @default(0)
  calculation String   @default("manual")
  suffix      String   @default("")
  upIsGood    Boolean  @default(true)
  decimals    Int      @default(0)
  updatedAt   DateTime @updatedAt
  user    User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  history MetricHistory[]
}

model MetricHistory {
  id         String   @id @default(cuid())
  metricId   String
  value      Float
  recordedAt DateTime @default(now())
  metric BusinessMetric @relation(fields: [metricId], references: [id], onDelete: Cascade)
}

model RecurringTransaction {
  id          String   @id @default(cuid())
  userId      String
  description String
  amount      Float
  type        TransactionType
  frequency   String   // DAILY | WEEKLY | MONTHLY | YEARLY
  categoryId  String?
  nextDate    DateTime
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  user     User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  category AccountCategory? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
}
```

- [ ] **Step 3: Add back-relations to `User`**

Inside `model User { ... }` relation block, add:

```prisma
  events         Event[]
  sprints        Sprint[]
  ideas          Idea[]
  journalEntries JournalEntry[]
  notifications  Notification[]
  resources      Resource[]
  fileAttachments FileAttachment[]
  metrics        BusinessMetric[]
  recurring      RecurringTransaction[]
```

Add to `model AccountCategory { ... }`: `recurring RecurringTransaction[]`.

- [ ] **Step 4: Validate schema**

Run: `pnpm --filter @arko/db exec prisma validate`
Expected: "The schema at prisma/schema.prisma is valid 🚀"

- [ ] **Step 5: Generate client**

Run: `pnpm db:generate`
Expected: success, new model types available.

- [ ] **Step 6: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "feat(db): reconcile Prisma schema with Django data model"
```

---

## Phase 2 — New domain routers

> Every router in this phase follows the `notes.ts` template. Each is registered in `root.ts` (Task 2.8). Each task: write router → write a unit test asserting the procedures exist and a create/list happens against a mocked `ctx.prisma` → typecheck → commit.

### Task 2.1: `notifications` router

**Files:**
- Create: `apps/web/src/server/api/routers/notifications.ts`
- Test: `apps/web/src/server/api/routers/__tests__/notifications.test.ts`

**Interfaces:**
- Produces: `notificationsRouter` with `list`, `unreadCount`, `markRead({id})`, `markAllRead`, `delete({id})`.

- [ ] **Step 1: Write the router**

```ts
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'

export const notificationsRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.notification.findMany({
      where: { userId: ctx.user.id! },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  ),
  unreadCount: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.notification.count({ where: { userId: ctx.user.id!, read: false } })
  ),
  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const n = await ctx.prisma.notification.findUnique({ where: { id: input.id } })
      if (!n || n.userId !== ctx.user.id!) throw new TRPCError({ code: 'FORBIDDEN' })
      return ctx.prisma.notification.update({ where: { id: input.id }, data: { read: true } })
    }),
  markAllRead: protectedProcedure.mutation(({ ctx }) =>
    ctx.prisma.notification.updateMany({ where: { userId: ctx.user.id!, read: false }, data: { read: true } })
  ),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const n = await ctx.prisma.notification.findUnique({ where: { id: input.id } })
      if (!n || n.userId !== ctx.user.id!) throw new TRPCError({ code: 'FORBIDDEN' })
      return ctx.prisma.notification.delete({ where: { id: input.id } })
    }),
})
```

- [ ] **Step 2: Write the test**

```ts
import { describe, it, expect, vi } from 'vitest'
import { notificationsRouter } from '../notifications'

const ctx = (rows: any[] = []) => ({
  user: { id: 'u1' },
  prisma: {
    notification: {
      findMany: vi.fn().mockResolvedValue(rows),
      count: vi.fn().mockResolvedValue(rows.length),
    },
  },
}) as any

describe('notifications router', () => {
  it('lists notifications for the current user', async () => {
    const caller = notificationsRouter.createCaller(ctx([{ id: 'n1' }]))
    const res = await caller.list()
    expect(res).toHaveLength(1)
  })
  it('returns unread count', async () => {
    const caller = notificationsRouter.createCaller(ctx([{ id: 'n1' }]))
    expect(await caller.unreadCount()).toBe(1)
  })
})
```

- [ ] **Step 3: Run test** — `pnpm --filter @arko/web test notifications` → PASS.
- [ ] **Step 4: Commit** — `git commit -am "feat(api): notifications router"`

### Task 2.2: `events` router (Event + Sprint)

**Files:**
- Create: `apps/web/src/server/api/routers/events.ts`
- Test: `apps/web/src/server/api/routers/__tests__/events.test.ts`

**Interfaces:**
- Produces: `eventsRouter` with `list`, `create`, `update`, `delete` for events, and `listSprints`, `createSprint`, `updateSprint`, `deleteSprint`.

- [ ] **Step 1: Write the router** — CRUD following `notes.ts`. Event create input:
`{ title: z.string().min(1), description: z.string().optional(), date: z.coerce.date(), endDate: z.coerce.date().optional(), startTime: z.string(), endTime: z.string(), color: z.string().default('#2D6A4F') }`, scoped by `userId: ctx.user.id!`, ownership-checked on update/delete.
Sprint create input: `{ name: z.string().min(1), goal: z.string().optional(), startDate: z.coerce.date(), endDate: z.coerce.date(), color: z.string().default('#2D6A4F'), isActive: z.boolean().default(true) }`.
- [ ] **Step 2: Test** — assert `list` returns rows for user (mock `ctx.prisma.event.findMany`) and `listSprints` returns rows (mock `sprint.findMany`), following Task 2.1 test shape.
- [ ] **Step 3: Run test** → PASS. **Step 4: Commit** — `feat(api): events + sprints router`.

### Task 2.3: `ideas` router

**Files:** Create `apps/web/src/server/api/routers/ideas.ts` + test.
**Interfaces:** `ideasRouter` with `list`, `create`, `update`, `delete`, `spawnTask({id})`.
- [ ] **Step 1:** CRUD following `notes.ts`. Create input: `{ title: z.string().min(1), description: z.string().optional(), status: z.enum(['IDEA','EXPLORING','VALIDATED','ARCHIVED']).default('IDEA'), tags: z.array(z.string()).default([]) }`. `spawnTask` creates a `Task` (title from idea) then sets `idea.spawnedTaskId`.
- [ ] **Step 2:** Test `list` + `spawnTask` (mock `ctx.prisma.task.create` and `idea.update`). **Step 3:** PASS. **Step 4:** Commit `feat(api): ideas router`.

### Task 2.4: `journal` router

**Files:** Create `apps/web/src/server/api/routers/journal.ts` + test.
**Interfaces:** `journalRouter` with `list`, `get`, `create`, `update`, `delete`.
- [ ] **Step 1:** CRUD following `notes.ts`. Create input: `{ title: z.string().min(1), content: z.string().optional(), mood: z.string().optional(), date: z.coerce.date().optional() }`.
- [ ] **Step 2:** Test `list`. **Step 3:** PASS. **Step 4:** Commit `feat(api): journal router`.

### Task 2.5: `resources` router

**Files:** Create `apps/web/src/server/api/routers/resources.ts` + test.
**Interfaces:** `resourcesRouter` with `list`, `create`, `update`, `delete`.
- [ ] **Step 1:** CRUD following `notes.ts`. Create input: `{ title: z.string().min(1), url: z.string().url().optional(), resourceType: z.enum(['LINK','FILE','DOC']).default('LINK'), description: z.string().optional(), tags: z.array(z.string()).default([]), fileId: z.string().optional() }`.
- [ ] **Step 2:** Test `list`. **Step 3:** PASS. **Step 4:** Commit `feat(api): resources router`.

### Task 2.6: `comments` router (polymorphic)

**Files:** Create `apps/web/src/server/api/routers/comments.ts` + test.
**Interfaces:** `commentsRouter` with `list({resourceType, resourceId})`, `create({resourceType, resourceId, content})`, `update({id, content})`, `delete({id})`.
- [ ] **Step 1:** `list` queries `where: { resourceType, resourceId }` (any user — comments are shared per resource), ordered `createdAt asc`, include `user: { select: { id, name, image } }`. `create` sets `userId: ctx.user.id!`. `update`/`delete` ownership-checked; `update` sets `edited: true`.
- [ ] **Step 2:** Test `create` writes with `userId` (mock `comment.create`) and `list` filters by resource. **Step 3:** PASS. **Step 4:** Commit `feat(api): polymorphic comments router`.

### Task 2.7: `storage` router (S3 presigned)

**Files:**
- Create: `apps/web/src/lib/s3.ts`
- Create: `apps/web/src/server/api/routers/storage.ts`
- Test: `apps/web/src/server/api/routers/__tests__/storage.test.ts`
- Modify: `apps/web/package.json` (add `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)

**Interfaces:**
- Produces: `storageRouter` with `createUploadUrl({fileName, mimeType, resourceType, resourceId?})` → `{ uploadUrl, fileKey }`; `confirm({fileKey, fileName, fileSize, mimeType, resourceType, resourceId?})` → writes `FileAttachment`; `listFor({resourceType, resourceId})`; `getDownloadUrl({id})` → `{ url }`; `delete({id})`.

- [ ] **Step 1: S3 client helper**

```ts
// apps/web/src/lib/s3.ts
import { S3Client } from '@aws-sdk/client-s3'
export const s3 = new S3Client({ region: process.env.AWS_REGION })
export const S3_BUCKET = process.env.S3_BUCKET!
```

- [ ] **Step 2: Router** — `createUploadUrl` builds `fileKey = \`${ctx.user.id}/${crypto.randomUUID()}-${fileName}\``, returns a presigned PUT URL via `getSignedUrl(s3, new PutObjectCommand({ Bucket: S3_BUCKET, Key: fileKey, ContentType: mimeType }), { expiresIn: 900 })`. `confirm` writes a `FileAttachment` row (`userId: ctx.user.id!`). `getDownloadUrl` ownership-checks then presigns a `GetObjectCommand`. `delete` ownership-checks, deletes the S3 object (`DeleteObjectCommand`) and the row.
- [ ] **Step 3: Add deps** — `pnpm --filter @arko/web add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`.
- [ ] **Step 4: Test** — mock the presigner (`vi.mock`) and assert `createUploadUrl` returns a `fileKey` scoped under the user id and `confirm` writes a row. **Step 5:** PASS. **Step 6:** Commit `feat(api): S3 presigned storage router`.

### Task 2.8: Register all new routers

**Files:** Modify `apps/web/src/server/api/root.ts`.
- [ ] **Step 1:** Import and add to `appRouter`: `notifications`, `events`, `ideas`, `journal`, `resources`, `comments`, `storage`.
- [ ] **Step 2:** Update `smoke.test.ts` to assert each new key exists in `appRouter._def.record`.
- [ ] **Step 3:** Run `pnpm --filter @arko/web test` → PASS. **Step 4:** Commit `feat(api): register new domain routers`.

---

## Phase 3 — Extend existing routers

### Task 3.1: Finance router — metrics + recurring

**Files:** Modify `apps/web/src/server/api/routers/finance.ts` + add test.
**Interfaces:** adds `listMetrics`, `upsertMetric({key,name,value,...})` (also appends a `MetricHistory` row when value changes), `listRecurring`, `createRecurring`, `updateRecurring`, `deleteRecurring`.
- [ ] **Step 1:** Read existing `finance.ts` to match its style. Add the procedures scoped by `userId`, following `notes.ts` ownership pattern. `upsertMetric` uses `prisma.businessMetric.upsert` on `@@unique` of (userId,key) — add `@@unique([userId, key])` to `BusinessMetric` in schema and regenerate.
- [ ] **Step 2:** Test `listMetrics` + `createRecurring`. **Step 3:** PASS. **Step 4:** Commit `feat(api): finance metrics + recurring transactions`.

### Task 3.2: Tasks router — dependencies (blocked-by)

**Files:** Modify `apps/web/src/server/api/routers/tasks.ts` + schema + test.
**Interfaces:** adds `addDependency({taskId, dependsOnId})`, `removeDependency({taskId, dependsOnId})`, and includes `dependsOn` in `list`.
- [ ] **Step 1:** Add self-M2M to `Task` in schema: `dependsOn Task[] @relation("TaskDeps") ` / `blockedBy Task[] @relation("TaskDeps")`. Regenerate. Add procedures using `connect`/`disconnect`.
- [ ] **Step 2:** Test `addDependency`. **Step 3:** PASS. **Step 4:** Commit `feat(api): task dependencies`.

### Task 3.3: Messages router — polling-friendly read/send/markRead

**Files:** Modify `apps/web/src/server/api/routers/messages.ts` + test.
**Interfaces:** ensure `listMessages({conversationId})` (asc, includes sender), `send({conversationId, content})`, `markRead({conversationId})` (sets participant `lastReadAt`), `listConversations`.
- [ ] **Step 1:** Read existing `messages.ts`; add/confirm these procedures with participant-membership auth check (`ctx.prisma.conversationParticipant.findFirst({where:{conversationId, userId}})` or FORBIDDEN).
- [ ] **Step 2:** Test `send` requires membership. **Step 3:** PASS. **Step 4:** Commit `feat(api): messaging read/send/markRead for polling`.

---

## Phase 4 — UI pages for new domains

> Each page mirrors an existing dashboard page (e.g. `notes/page.tsx`) using `trpc.<domain>.list.useQuery(...)`. Verification = `pnpm --filter @arko/web build` compiles the route and `pnpm typecheck` passes (repo has no UI test harness; matches existing code).

### Task 4.1: Add nav entries + route stubs

**Files:** Modify `apps/web/src/app/dashboard/nav.tsx`; create `apps/web/src/app/dashboard/{events,ideas,journal,resources,notifications}/page.tsx`.
- [ ] **Step 1:** Add nav items (label + icon + href) for Events, Ideas, Journal, Resources, Notifications following existing `nav.tsx` entries.
- [ ] **Step 2:** Create each `page.tsx` as a client component listing items via `trpc.<domain>.list.useQuery()` with a create form, modeled on `notes/page.tsx`. Messaging polling: in `messages/page.tsx`, pass `{ refetchInterval: 4000 }` to the `listMessages`/`listConversations` `useQuery`.
- [ ] **Step 3:** Run `pnpm --filter @arko/web build` → routes compile. **Step 4:** Commit `feat(ui): pages for events, ideas, journal, resources, notifications + message polling`.

### Task 4.2: Notification bell + comments widget

**Files:** Modify `apps/web/src/app/dashboard/_components/dashboard-header.tsx`; create `apps/web/src/components/comments-panel.tsx`.
- [ ] **Step 1:** Header bell uses `trpc.notifications.unreadCount.useQuery(undefined, { refetchInterval: 15000 })` + dropdown calling `list`/`markAllRead`.
- [ ] **Step 2:** `CommentsPanel({resourceType, resourceId})` reusable component using `trpc.comments.list`/`create`. Wire into `tasks` and `ideas` detail views.
- [ ] **Step 3:** `pnpm --filter @arko/web build` → PASS. **Step 4:** Commit `feat(ui): notification bell + comments panel`.

---

## Phase 5 — Config, env, deploy

### Task 5.1: Env template + config

**Files:** Modify `apps/web/.env.example`; create `apps/web/.env` (local, gitignored).
- [ ] **Step 1:** Add to `.env.example`: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`.
- [ ] **Step 2:** **[USER ACTION]** Create a Neon Postgres DB and paste its pooled `DATABASE_URL` into `apps/web/.env`; set `AUTH_SECRET` via `openssl rand -base64 32`; paste existing S3 creds.
- [ ] **Step 3:** Commit `chore: env template for Neon + S3`.

### Task 5.2: Migrate schema to Neon + seed

**Files:** none (commands); may edit `packages/db/prisma/seed.ts`.
- [ ] **Step 1:** `pnpm db:migrate --name init` → creates migration + applies to Neon.
- [ ] **Step 2:** `pnpm --filter @arko/db exec tsx prisma/seed.ts` (seed admin + finance). Fix seed to match reconciled schema if it errors.
- [ ] **Step 3:** `pnpm dev`, open `http://localhost:3000`, log in with seeded admin, CRUD-smoke each domain. Record results.
- [ ] **Step 4:** Commit any seed fixes `chore(db): initial migration + seed against Neon`.

### Task 5.3: Vercel deploy config

**Files:** Modify `apps/web/vercel.json`; create root `vercel.json` if needed for monorepo.
- [ ] **Step 1:** Read existing `apps/web/vercel.json`. Ensure build = `pnpm build`, install respects workspace, `prisma generate` runs (add `"postinstall": "prisma generate"` in `packages/db` or root build). Ensure `prisma migrate deploy` runs in the Vercel build command.
- [ ] **Step 2:** **[USER ACTION]** `vercel link` (root = repo, project root dir = `apps/web`), add all env vars from Task 5.1 in Vercel dashboard/`vercel env`.
- [ ] **Step 3:** `vercel --prod=false` (preview deploy) → verify login + one CRUD flow on the preview URL.
- [ ] **Step 4:** Commit `chore(deploy): vercel monorepo config`.

---

## Phase 6 — Verification gate

### Task 6.1: Full acceptance pass

- [ ] `pnpm install && pnpm build` clean at root.
- [ ] Migrations applied to Neon; app deploys to Vercel preview.
- [ ] Login works; CRUD verified in **all 15 domains** (auth/users, finance, tasks, notes, reminders, messages, workflows, comments, events, ideas, journal, notifications, resources, storage, github) — check each off individually.
- [ ] S3 presigned upload + download verified.
- [ ] Messaging updates via polling.
- [ ] Record the pass in `docs/superpowers/plans/` as a short completion note. Commit.

---

## Phase 7 — Cleanup (only after Phase 6 passes)

### Task 7.1: Remove Django, Vite, and Render

**Files:** Delete `backend/`, `frontend/`, `apps/web` leftover empty dir if any, `render.yaml`, `Procfile`, `render-build.sh`, `render-env-template.txt`, `docker-compose.yml` (Django), `api/` (if Django-related). Update root `README.md` and `AGENTS.md`.
- [ ] **Step 1:** Confirm nothing in `apps/web` imports from `backend/` or `frontend/` (`grep -r`).
- [ ] **Step 2:** `git rm -r backend frontend render.yaml Procfile render-build.sh render-env-template.txt`; inspect `api/` and `docker-compose.yml` and remove if Django-only.
- [ ] **Step 3:** `pnpm build` still clean.
- [ ] **Step 4:** Update `README.md` (Next.js/Vercel instructions) and `AGENTS.md`.
- [ ] **Step 5:** Commit `chore: remove Django backend, Vite frontend, and Render deploy`.

---

## Self-Review notes

- **Spec coverage:** all 15 domains have a router task (Phase 2/3) and UI task (Phase 4); auth already present; S3 (2.7), polling (3.3/4.1), Neon (5.2), deploy (5.3), cleanup (7.1) each mapped. ✅
- **Prerequisites needing user** are marked `[USER ACTION]` in Tasks 5.1/5.2/5.3.
- **Type consistency:** router export names (`notificationsRouter`, `eventsRouter`, `ideasRouter`, `journalRouter`, `resourcesRouter`, `commentsRouter`, `storageRouter`, `financeRouter`, `tasksRouter`, `messagesRouter`) match their `root.ts` registrations.
- **Known risk:** the restored `finance.ts`/`tasks.ts`/`messages.ts` may reference schema fields that changed; Tasks 3.1–3.3 begin by reading the existing file to reconcile before adding.
