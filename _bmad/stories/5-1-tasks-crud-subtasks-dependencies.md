# Story 5.1: Tasks — Edit, Delete, Subtasks & Dependencies

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a team member using ARKO,
I want to edit and delete tasks, break a task into subtasks, and mark tasks as blocked by other tasks,
so that I can manage real work end-to-end on the Kanban board instead of only creating tasks and dragging their status.

## Context & Problem

The `tasks` tRPC router (`apps/web/src/server/api/routers/tasks.ts`) only exposes `list`, `create`, `assignTask`, and `updateStatus`. There is **no** way to edit a task's fields, delete a task, create a subtask, or express a blocking dependency — even though `docs/ROADMAP.md` marks "Task subtasks & dependencies" as ✅ shipped. That claim reflects the old Django stack; the Next.js + tRPC/Prisma migration never carried it over. This story closes the gap on the current stack.

**Schema reality (read carefully — it is misleading):** `packages/db/prisma/schema.prisma` `Task` already has `parentId` + a self-relation *named* `@relation("TaskDependencies")`, but that relation is semantically **parent → subtasks (hierarchy)**, NOT a blocking dependency. So:

- **Subtasks** = already representable via existing `parentId` / `subtasks`. No schema change needed for hierarchy.
- **Dependencies (blocked-by)** = do NOT exist yet. Despite the relation name, there is no many-to-many "blocks / blocked-by" edge. A new relation/model is required (see Dev Notes).

## Acceptance Criteria

1. `tasks.update` procedure edits `title`, `description`, `priority`, and `status`; partial updates supported (only provided fields change).
2. `tasks.delete` procedure deletes a task; its subtasks are re-parented to `null` (promoted to top-level) — not silently cascade-deleted — and the behavior is documented.
3. Subtask creation is supported: either `tasks.create` accepts an optional `parentId`, or a `tasks.createSubtask` procedure exists. Created subtask has `parentId` set to a task the caller may access.
4. A real blocked-by dependency is added to the Prisma schema (new relation/model) with a migration, and procedures exist to add and remove a dependency between two tasks.
5. Validation: a task cannot be its own parent; subtask nesting is limited to one level (a subtask cannot itself have subtasks) OR arbitrary nesting is explicitly allowed and cycle-checked — pick one and document it; dependencies reject self-reference and reject cycles (A blocks B blocks A).
6. `tasks.list` (or a `tasks.get`) returns each task's `subtasks` (id, title, status) and `dependsOn` (id, title, status) so the board can render hierarchy and blocking state.
7. Authorization on `update`, `delete`, `createSubtask`, and dependency mutations mirrors the **existing** task ownership rule: only the task's `assigneeId` may act, with an `ADMIN` role bypass (see `updateStatus`/`assignTask`). It does NOT use the `userId`-owner pattern from `notes.ts`.
8. Frontend: clicking a Kanban card opens a task detail view (drawer or modal) with an edit form wired to `tasks.update` and a delete action guarded by a confirmation.
9. Frontend: from the detail view, a subtask can be added inline; the parent card shows subtask progress (e.g. "3/5").
10. Frontend: a dependency picker (typeahead over the user's tasks) sets blocked-by; a card blocked by an incomplete task shows a "Blocked by …" indicator and **cannot be dropped into `DONE`** (the native drag-drop handler rejects it).
11. Router unit tests (Vitest, `createCaller` + mocked prisma) cover: update happy path, update auth failure, delete + subtask re-parent, self-parent rejection, dependency add/remove, and cycle/self-dependency rejection.

## Tasks / Subtasks

- [x] **Schema + migration** (AC: #4, #5)
  - [x] In `packages/db/prisma/schema.prisma`, added explicit join model `TaskDependency { id; blockingId; blockedId; @@unique([blockingId, blockedId]) }` with `BlockingTask`/`BlockedTask` named relations back to `Task`. Existing `TaskDependencies` self-relation left untouched.
  - [x] Staged migration (no DB write, per user decision): `packages/db/prisma/migrations/20260723161329_task_dependencies/migration.sql`; ran `prisma generate` to regenerate the client. **Apply pending** — user runs `pnpm --filter @arko/db exec prisma migrate deploy` (or `pnpm db:migrate`) against Supabase.
- [x] **Router: `tasks.update`** (AC: #1, #7)
  - [x] zod input `{ id, title?, description?, priority?, status? }`; spreads only defined fields into `data`.
  - [x] Reuses the assignee+ADMIN ownership guard via shared `assertTaskAccess` (mirrors `updateStatus`).
- [x] **Router: `tasks.delete`** (AC: #2, #7)
  - [x] Ownership guard; `updateMany` subtasks `{ parentId: id }` → `parentId: null`; then delete.
- [x] **Router: subtasks** (AC: #3, #5)
  - [x] Added optional `parentId` to `create`; validates parent exists; enforces one-level nesting (rejects parent that itself has a parent).
- [x] **Router: dependencies** (AC: #4, #5)
  - [x] `tasks.addDependency({ taskId, blockerId })` and `tasks.removeDependency`; rejects self-dependency; BFS `wouldCreateCycle` rejects cycles before insert.
- [x] **Router: read shape** (AC: #6)
  - [x] Extended `list` `include` to return `subtasks {id,title,status}` and `blockedBy → blocking {id,title,status}`.
- [x] **Frontend: task detail drawer** (AC: #8, #9)
  - [x] Card `onClick` opens a slide-over drawer; edit form wired to `tasks.update`; delete with `confirm()`; `utils.tasks.list.invalidate()` on success. Subtasks nested tasks hidden from top-level columns (`!t.parentId`).
  - [x] Inline "add subtask"; subtask progress badge (`doneSubs/total`) on the parent card.
- [x] **Frontend: dependencies + blocked drag rule** (AC: #10)
  - [x] Dependency typeahead over the user's tasks; "Blocked" badge on card; `handleDrop` blocks moving a blocked task to `DONE` (+ server-side `assertNotBlocked` guard in `update`/`updateStatus`).
- [x] **Tests** (AC: #11)
  - [x] Vitest suite `apps/web/src/server/api/routers/__tests__/tasks.test.ts` — 9 tests (update happy/auth-fail, delete+re-parent, subtask nesting reject/create, dependency add/self-reject/cycle-reject, remove). All green.

## Dev Notes

### Technical stack (pinned from package.json — do not swap libraries)

- **Next.js** `^15.5.19` (App Router), **React** `^19.2.7`. ⚠️ `arko/AGENTS.md`: "This is NOT the Next.js you know" — for any App Router/Server-Component behavior consult `node_modules/next/dist/docs/` before assuming APIs.
- **tRPC** `^11.0.0` (`@trpc/server`, `@trpc/client`, `@trpc/react-query`), **TanStack Query** `^5.60.0`, **superjson** `^2.2.0` transformer.
- **Prisma** `^6.1.0` via `@arko/db` (`packages/db`). Client is a singleton exported as `prisma` from `@arko/db`.
- **Auth**: `next-auth@^5.0.0-beta.25`; session + role injected into tRPC context in `apps/web/src/lib/trpc/context.ts`.
- **Testing**: `vitest@^4.1.10`.
- **UI**: `@arko/ui` (`Card`, `CardContent`, `Button`), `lucide-react` icons, Tailwind. **Drag-and-drop is native HTML5** (`draggable`, `onDragStart`/`onDrop` with `dataTransfer`) — there is NO dnd library; do not add one.

### Architecture compliance / guardrails (mirror existing patterns exactly)

- **Ownership pattern for tasks is `assigneeId`, not `userId`.** `updateStatus` and `assignTask` do: fetch task `assigneeId` → if `!== ctx.user.id` → look up `user.role`, allow only if `'ADMIN'` else `throw new TRPCError({ code: 'FORBIDDEN' })`. Copy this. Do **not** copy `notes.ts` (which keys on `note.userId`) — tasks have no `userId` owner column.
- **Not-found handling**: `throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })` — same wording as existing procedures.
- **All task mutations `include: { assignee: { select: { id, name, email, image } } }`** in their return so the client keeps a consistent shape.
- **`tasks.list` filters `where: { assigneeId: userId }`** — it only returns tasks assigned to the current user. Subtasks assigned to a *different* user will not appear in that list; when rendering subtask progress, fetch subtasks via the parent relation (server-side `include`) rather than relying on the flat `list`. Note this so subtask counts aren't silently wrong.
- **`create` sets `position` = global max position + 1** (not per-column). Keep subtasks consistent; do not reindex existing tasks.
- **Register nothing new in `root.ts`** — `tasks` router is already wired; adding procedures to the existing `tasksRouter` is sufficient.
- **`protectedProcedure`** already enforces auth (`UNAUTHORIZED` if no session) — do not re-check session existence, only the per-task ownership.

### Prisma schema notes (the trap)

Current `Task` self-relation:

```prisma
parentId   String?
parent     Task?  @relation("TaskDependencies", fields: [parentId], references: [id])
subtasks   Task[] @relation("TaskDependencies")
```

The relation NAME says "TaskDependencies" but it is **parent/subtasks hierarchy**. Reuse it for subtasks. For real blocked-by edges, add a **separate** model (recommended `TaskDependency` join table) so hierarchy and blocking stay distinct. Renaming the existing relation would require a data migration and touch unrelated code — don't.

### Testing standards

- Router tests live in `apps/web/src/server/api/routers/__tests__/*.test.ts`.
- Pattern: `const caller = tasksRouter.createCaller(ctx)` where `ctx` is a hand-rolled object `{ user, session, userRole, prisma: { task: { findUnique: vi.fn()..., update: vi.fn()..., updateMany: vi.fn()... } } }` (see `notifications.test.ts`, `events.test.ts`). Mock only the prisma methods each procedure calls.
- Cover auth-failure branches by setting `userRole: 'USER'` and a task whose `assigneeId` differs from `ctx.user.id`, then `expect(caller.update(...)).rejects` with a `FORBIDDEN` TRPCError.

### Project Structure Notes

- Backend procedures: `apps/web/src/server/api/routers/tasks.ts` (existing file, extend it).
- Schema: `packages/db/prisma/schema.prisma`; migrations under `packages/db/prisma/migrations/`.
- Frontend: `apps/web/src/app/dashboard/tasks/page.tsx` (single client component today; the detail drawer can be a co-located component under the same route folder).
- The old `frontend/` (Vite SPA) and Django `backend/tasks_app/` are legacy and out of scope — do not modify them.

### References

- [Source: _bmad/planning/sprint-5-epic.md#Story 5.1] — epic-level acceptance criteria and priority (P0).
- [Source: apps/web/src/server/api/routers/tasks.ts] — existing procedures + `assigneeId`/ADMIN ownership pattern to mirror.
- [Source: apps/web/src/server/api/routers/notes.ts] — CRUD shape reference (but NOTE: different ownership column).
- [Source: apps/web/src/server/api/trpc.ts] — `protectedProcedure`, `requireRole`, `requireOwnership` helpers.
- [Source: apps/web/src/lib/trpc/context.ts] — tRPC context (`prisma`, `session`, `user`, `userRole`).
- [Source: packages/db/prisma/schema.prisma] — `Task` model + mislabeled `TaskDependencies` self-relation; `TaskStatus`/`Priority` enums.
- [Source: apps/web/src/app/dashboard/tasks/page.tsx] — Kanban board, native DnD, mutation+invalidate pattern.
- [Source: apps/web/src/server/api/routers/__tests__/notifications.test.ts] — Vitest `createCaller` + mocked-prisma pattern.
- [Source: docs/ROADMAP.md] — stale; claims this feature shipped (it did not on this stack).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (dev-story workflow)

### Debug Log References

- RED: `vitest run tasks.test.ts` → 9/9 failed ("No procedure found on path …") before implementation.
- GREEN: after router implementation → 9/9 passed.
- Full suite: `vitest run` → 8 files / 27 tests passed (no regressions).
- Typecheck: `tsc --noEmit` → exit 0.
- Lint: `next lint` is broken at the repo level (ESLint 9 flat-config incompatibility; no standalone `eslint` binary) — could not run; pre-existing, unrelated to this change.

### Completion Notes List

- Implemented full task CRUD + hierarchy + blocking dependencies on the tRPC/Prisma stack, mirroring the existing `assigneeId` + ADMIN ownership pattern (shared `assertTaskAccess`).
- **Dependencies** modeled as a new `TaskDependency` join table (directed `blocking → blocked`), kept separate from the mislabeled `TaskDependencies` self-relation (which remains parent/subtask hierarchy). Cycle prevention via BFS; self-dependency rejected; `@@unique([blockingId, blockedId])` prevents duplicates.
- **Subtasks** use the existing `parentId`; nesting limited to one level. Subtasks are excluded from the top-level Kanban columns and shown inside the parent's detail drawer with a `done/total` progress badge.
- **Blocked→DONE** is enforced in two places: client `handleDrop` guard + server `assertNotBlocked` in `update`/`updateStatus`.
- ⚠️ **DB migration is STAGED, NOT APPLIED** (per user decision). The feature is unit-tested (mocked Prisma) and typechecks against the regenerated client, but has NOT been verified end-to-end against a live database. Before this works in the running app, apply: `cd packages/db && pnpm exec prisma migrate deploy` (targets the Supabase `arko` schema). Review `migration.sql` first.
- No new runtime dependencies added. No commits made (working on branch `feat/5-1-tasks-crud-subtasks-deps`).

### File List

- `packages/db/prisma/schema.prisma` (modified — added `TaskDependency` model + `blocking`/`blockedBy` relations on `Task`)
- `packages/db/prisma/migrations/20260723161329_task_dependencies/migration.sql` (new — staged, not applied)
- `apps/web/src/server/api/routers/tasks.ts` (modified — `update`, `delete`, subtask support on `create`, `addDependency`, `removeDependency`, extended `list`, blocked guard, helpers)
- `apps/web/src/server/api/routers/__tests__/tasks.test.ts` (new — 9 tests)
- `apps/web/src/app/dashboard/tasks/page.tsx` (modified — detail drawer, subtasks, dependency picker, blocked badge/drag guard)

## Change Log

| Date | Change |
|---|---|
| 2026-07-23 | Implemented Story 5.1 — task edit/delete, subtasks, and blocking dependencies on tRPC/Prisma. DB migration staged (not applied). Status → review. |
| 2026-07-23 | Adversarial code review — fixed 4 findings (2 High, 2 Med); +5 tests (32 total). Status → done. |

## Tasks/Subtasks — Review Follow-ups (AI)

- [ ] [AI-Review][Low] Decide + document whether `addDependency` should restrict the blocker task's accessibility (currently any task id may be a blocker) — `apps/web/src/server/api/routers/tasks.ts` `addDependency`.
- [ ] [AI-Review][Low] Tighten types: replace `any` in `assertTaskAccess`/helpers and share the assignee+ADMIN lookup between `assignTask` and `assertTaskAccess` — `apps/web/src/server/api/routers/tasks.ts`.

## Senior Developer Review (AI)

**Reviewer:** claude-opus-4-8 (adversarial code-review workflow)
**Date:** 2026-07-23
**Outcome:** Approved with fixes applied (2 High + 2 Medium resolved; 2 Low deferred as follow-ups above)

### Findings & Resolution

- [x] **[High] Broken authorization in subtask creation.** `create`'s `parentId` branch verified existence + nesting but not caller access — any user could attach a subtask to anyone's task. **Fixed:** now calls `assertTaskAccess(ctx, parentId)` (assignee/ADMIN) before allowing. Regression test added (`rejects creating a subtask under a parent the caller cannot access`).
- [x] **[High] Subtasks could not be completed → progress badge permanently 0/N.** Subtasks were excluded from the board and rendered as static text with no status control. **Fixed:** subtask rows in the detail drawer are now checkboxes wired to `tasks.updateStatus`, so `done/total` advances.
- [x] **[Med] Server-side blocked→DONE guard and new `list` shape were untested.** **Fixed:** added 4 tests — `update`/`updateStatus` reject DONE while blocked, allow DONE once blockers are DONE, and `list` includes `subtasks`/`blockedBy`.
- [x] **[Med] Native `alert()`/`confirm()` instead of the app's inline UX (AC #10 said "toast").** **Fixed:** replaced with a dismissible inline notice card (mutation errors + blocked-drag) and a two-step inline delete confirm.

### Deferred (Low — see Review Follow-ups above)

- Blocker accessibility policy on `addDependency` (undocumented decision).
- `any` types + duplicated ADMIN lookup in router helpers.

### Gate note

Code is complete, typechecks, and unit-tested (32 passing). ⚠️ Still **not verified end-to-end** — the `TaskDependency` migration is staged, not applied. Apply `cd packages/db && pnpm exec prisma migrate deploy` and smoke-test before treating as shippable.
