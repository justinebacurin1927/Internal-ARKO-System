---
title: Sprint 5 — Migration Gap Closure
epic: 5
status: backlog
created: 2026-07-23
---

# Epic 5: Migration Gap Closure (Next.js + tRPC/Prisma)

**Status:** Backlog
**Target:** Close the backend/frontend gaps left by the Vite+Django → Next.js+tRPC/Prisma migration.

## Overview

ARKO migrated its frontend from a Vite React SPA to Next.js (App Router) and its
backend from Django/DRF to a tRPC + Prisma layer (`@arko/db`, NextAuth sessions).
During the cutover, several features from Sprint 3 / 3.5 were **not carried over
intact**: some have a complete tRPC backend but no UI, some have UI but incomplete
procedures, and two are outright stubs. `docs/ROADMAP.md` and `docs/ARCHITECTURE.md`
still describe the old Django stack and mark these features "done" — they are not.

This epic closes those gaps so every shipped feature works end-to-end on the new stack.

**Audit basis (2026-07-23):** every `api.*` call made by a page resolves to an
existing procedure (no dangling calls / hard crashes), so the work is wiring orphaned
backends to UI and finishing two stubbed features — not net-new product scope.

**Reference — new stack conventions:**
- Backend procedures live in `apps/web/src/server/api/routers/*.ts`, registered in `root.ts`.
- Data models live in `packages/db/prisma/schema.prisma` (`@arko/db`).
- Auth/session via NextAuth (`apps/web/src/lib/auth.ts`); tRPC context injects `prisma`, `session`, `userRole`.
- Pages call procedures via `api` from `apps/web/src/lib/trpc/client`.

---

## Priority P0 — Broken / stubbed (feature does not work)

## Story 5.1: Tasks — Edit, Delete, Subtasks & Dependencies

**Status:** backlog
**Effort:** 4 days

### Description

The `tasks` router only exposes `list`, `create`, `assignTask`, and `updateStatus`.
There is no way to edit a task's fields, delete a task, or create subtasks/dependencies
— even though the Prisma `Task` model already has a self-referential `parentId`
relation. ROADMAP.md claims "Task subtasks & dependencies" shipped; the new stack
never implemented it. This story completes task CRUD and hierarchy.

### Acceptance Criteria

- [ ] Backend: `tasks.update` procedure — edit title, description, priority, status (owner/assignee or ADMIN)
- [ ] Backend: `tasks.delete` procedure — cascade or reparent subtasks (decide + document)
- [ ] Backend: `tasks.createSubtask` (or `create` accepts `parentId`) using the existing `Task.parent` relation
- [ ] Backend: dependency support — add a `TaskDependency` model (or `blockedBy` self-relation) to schema + migration
- [ ] Backend: validation — no self-parenting, no circular dependencies (A→B→A)
- [ ] Backend: `tasks.list` returns `subtasks` and `dependsOn: [{id,title,status}]`
- [ ] Frontend: task detail drawer/modal with edit form (wire `tasks.update`)
- [ ] Frontend: delete action with confirmation dialog
- [ ] Frontend: inline "add subtask" + subtask progress bar on Kanban card (e.g. "3/5")
- [ ] Frontend: dependency picker (typeahead) + "Blocked by #id" indicator on card
- [ ] Frontend: blocked tasks cannot be dragged to DONE
- [ ] Tests: router unit tests for update/delete/subtask/dependency + circular-dep guard

---

## Story 5.2: Workflows — Real Execution Engine

**Status:** backlog
**Effort:** 5 days

### Description

`workflows.execute` currently just inserts a `WorkflowExecution` row with status
`PENDING` and returns — no steps run, no logs are written, status never advances.
The workflows page only calls `workflows.list`; it can't create or run anything.
Build a real (even if synchronous/minimal) execution path and wire the UI.

### Acceptance Criteria

- [ ] Backend: define workflow step/config shape on the `Workflow` model (document the JSON schema stored)
- [ ] Backend: `workflows.execute` transitions `WorkflowExecution` PENDING → RUNNING → COMPLETED/FAILED
- [ ] Backend: each step writes an `ExecutionLog` row (level, message, timestamp)
- [ ] Backend: failures set status FAILED and log the error; execution is idempotent per run
- [ ] Backend: `workflows.getExecution` / `workflows.listExecutions` to fetch run history + logs
- [ ] Backend: authorization — only workflow owner (or ADMIN) can execute
- [ ] Frontend: "New workflow" form on the workflows page (wire `workflows.create`)
- [ ] Frontend: "Run" button per workflow (wire `workflows.execute`) with running state
- [ ] Frontend: execution history panel with per-step logs and final status
- [ ] Tests: execute happy-path (status progression + logs) and failure-path

---

## Priority P1 — Backend exists, no UI (orphaned)

## Story 5.3: Task Comments — Surface the UI

**Status:** backlog
**Effort:** 2 days

### Description

The `comments` router is complete (`create`, `list`, `update`, `delete`) and the
`Comment` model exists, but no page renders comments. Surface comment threads on
tasks (the generic `resourceType`/`resourceId` design supports other resources later).

### Acceptance Criteria

- [ ] Frontend: comment thread component in the task detail drawer/modal
- [ ] Frontend: list comments via `comments.list` (chronological), author avatar + name + relative time
- [ ] Frontend: add comment via `comments.create` with optimistic update / invalidate
- [ ] Frontend: edit own comment via `comments.update`; delete via `comments.delete` (confirm dialog)
- [ ] Frontend: comment count badge on the Kanban card
- [ ] Backend: verify `comments` procedures enforce author ownership on update/delete
- [ ] Backend: (optional) notification trigger on new comment for task assignee
- [ ] Tests: component renders list + create/edit/delete happy paths

---

## Story 5.4: File Attachments — Surface the Uploader

**Status:** backlog
**Effort:** 3 days

### Description

The `storage` router (`createUploadUrl`, `confirm`, `getDownloadUrl`, `listFor`,
`delete`), the S3 helper (`src/lib/s3.ts`), and the `FileAttachment` model are all in
place, but there is no upload UI anywhere. Add a reusable uploader and wire it to tasks
and resources.

### Acceptance Criteria

- [ ] Frontend: reusable `FileUploader` (drag-and-drop + click) using the presigned-URL flow (`createUploadUrl` → PUT to S3 → `confirm`)
- [ ] Frontend: attachment list (image thumbnail / file icon + name + size) via `storage.listFor`
- [ ] Frontend: download via `getDownloadUrl`; delete via `storage.delete` (confirm)
- [ ] Frontend: upload progress indicator + error handling
- [ ] Frontend: wire uploader into task detail drawer and resource create/edit
- [ ] Backend: verify file size limit + allowed content types enforced in `createUploadUrl`/`confirm`
- [ ] Backend: verify Supabase Storage (prod) and MinIO (local) both work via `s3.ts`
- [ ] Tests: presign → confirm → list → delete round-trip

---

## Story 5.5: Settings — Make It Functional

**Status:** backlog
**Effort:** 3 days

### Description

`settings/page.tsx` renders only a static list of section links — no forms are wired.
`users.updateProfile` exists but is unused, and there is no password-change procedure.
Implement working profile editing, password change, and basic preferences.

### Acceptance Criteria

- [ ] Frontend: Profile section form (name, email, avatar) wired to `users.updateProfile`
- [ ] Backend: `users.changePassword` procedure (verify current password, hash new) — new proc, does not exist
- [ ] Frontend: Password-change form wired to `users.changePassword` with validation
- [ ] Frontend: success/error toasts + inline validation on both forms
- [ ] Backend: authorization — a user can only edit their own profile/password (ADMIN may edit others via existing admin flows)
- [ ] Frontend: (optional) preferences section (theme/notifications) — scope or defer explicitly
- [ ] Tests: updateProfile + changePassword happy + auth-failure paths

---

## Priority P2 — Capability exists, not surfaced

## Story 5.6: Finance — Recurring Transactions & Business Metrics

**Status:** backlog
**Effort:** 3 days

### Description

The `finance` router exposes recurring-transaction procedures
(`createRecurring`, `listRecurring`, `updateRecurring`, `deleteRecurring`) and metrics
procedures (`listMetrics`, `upsertMetric`), plus the schema has a `Budget` model — none
are surfaced in the finance page. Add UI; add budget procedures if budgets are in scope.

### Acceptance Criteria

- [ ] Frontend: recurring transactions manager (list/create/edit/delete) wired to the `*Recurring` procedures
- [ ] Frontend: business-metrics view wired to `listMetrics` / `upsertMetric` (+ `MetricHistory`)
- [ ] Backend: decide budgets — either add `finance.*Budget` procedures + UI, or explicitly defer (document)
- [ ] Backend: confirm recurring generation runs somewhere (cron/scheduled) or document manual trigger
- [ ] Tests: recurring CRUD + metric upsert

---

## Story 5.7: Events — Sprints UI

**Status:** backlog
**Effort:** 2 days

### Description

The `events` router has full sprint procedures (`createSprint`, `listSprints`,
`updateSprint`, `deleteSprint`) and a `Sprint` model, but the events page only handles
events. Add a sprints view/section.

### Acceptance Criteria

- [ ] Frontend: sprints list/section on the events page wired to `listSprints`
- [ ] Frontend: create/edit/delete sprint wired to the sprint procedures
- [ ] Frontend: associate events with a sprint if the schema relates them (verify relation first)
- [ ] Tests: sprint CRUD wiring

---

## Story 5.8: Journal & Resources — Editing

**Status:** backlog
**Effort:** 1 day

### Description

`journal` (`get`, `update`) and `resources` (`update`) expose edit procedures that no
page calls — entries/resources can be created and deleted but not edited. Wire edit UI.

### Acceptance Criteria

- [ ] Frontend: edit an existing journal entry via `journal.update` (load via `journal.get`)
- [ ] Frontend: edit an existing resource via `resources.update`
- [ ] Frontend: edit affordance (button/menu) on each journal/resource item
- [ ] Tests: edit happy path for both

---

## Story 5.9: User Management — Hardening & Completion

**Status:** backlog
**Effort:** 2 days
**Priority:** P2 — backend CRUD exists; close robustness + coverage gaps

### Description

Unlike the other Epic 5 items, user management is **not** a missing backend — the `users`
router already has admin-gated `list`, `create` (auto email/password/gravatar), `updateProfile`,
`updateRole`, `updateStatus`, and `delete`, with self-protection guards, and the users page is
wired to them. What's missing is robustness and safety:

- **No tests** for a router with real logic (password generation, email-uniqueness loop, self-role/self-delete guards).
- **No password reset** for an existing user — `create` returns a generated password once, but an admin can't regenerate it later.
- **Unsafe delete**: `Transaction.userId` is a required relation, so deleting a user who has transactions will throw a raw FK error (poor UX / potential 500).

### Acceptance Criteria

- [ ] Backend: `users.resetPassword({ userId })` (admin only) — regenerates + hashes a password, returns the plaintext once (mirror `create`'s pattern).
- [ ] Backend: `delete` handles related records gracefully — either block with a clear message when the user owns transactions/records, or reassign/soft-delete; document the choice.
- [ ] Backend: confirm `updateRole`/`updateStatus`/`delete` self-protection guards stay intact.
- [ ] Frontend: admin can trigger a password reset and see/copy the new password; safe-delete surfaces the friendly error.
- [ ] Frontend: verify create-time generated password is shown/copyable and role/status controls work end-to-end.
- [ ] Tests: `users.test.ts` covering create (email uniqueness + generated password), self-role/self-delete/self-status guards, resetPassword, and safe-delete behavior.

## Notes / Follow-ups (not stories)

- **Docs are stale:** `docs/ROADMAP.md` and `docs/ARCHITECTURE.md` describe the Django/Vite
  stack and mark migrated features "done." Update them to reflect Next.js + tRPC + Prisma
  once this epic lands (tracked as a doc task, not a story here).
- **Old Sprint 3 / 3.5 stories** (`_bmad/stories/3-*`, `4-*`) were written against Django/DRF
  and are superseded by this epic on the new stack; leave as historical record.
- **Old `frontend/` Vite SPA and Django `backend/`** remain in the repo; decommissioning them
  is out of scope for this epic.
