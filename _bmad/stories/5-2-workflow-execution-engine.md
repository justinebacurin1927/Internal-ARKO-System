# Story 5.2: Workflows — Real Execution Engine

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a team member using ARKO,
I want to create a workflow and actually run it, seeing each step execute with a log and a final status,
so that "Workflows" is a working automation feature instead of a page that only lists records and a Run action that does nothing.

## Context & Problem

On the current Next.js + tRPC/Prisma stack the workflows feature is a stub:

- `workflows.execute` (`apps/web/src/server/api/routers/workflows.ts:34`) **only inserts a `WorkflowExecution` row with status `PENDING` and returns** — no steps run, no `ExecutionLog` is written, status never advances, `startedAt`/`completedAt`/`output` stay null.
- The page (`apps/web/src/app/dashboard/workflows/page.tsx`) only calls `workflows.list`. The **"New Workflow" button has no `onClick`**, cards have **no Run button**, and the empty state renders **three hardcoded mock template cards**.

The schema is ready: `Workflow.definition` (String — intended JSON/YAML), `WorkflowExecution { status, input, output, startedAt, completedAt }`, `ExecutionLog { step, message, level }`, and the `ExecutionStatus`/`LogLevel` enums. This story builds a real (minimal, synchronous) execution engine and wires the UI.

**Scope guard (keep it minimal):** this is NOT a full automation platform. Define a small, typed step model and a sequential runner that logs each step. Anything bigger (branching, external calls, scheduling, retries) is out of scope and should be a later story.

## Acceptance Criteria

1. A workflow `definition` shape is defined and documented: JSON `{ "steps": [{ "name": string, "action": "log" | "noop", "message"?: string }] }`. `create` validates it parses to this shape (reject invalid JSON / unknown action with `BAD_REQUEST`).
2. `workflows.execute` runs synchronously through the steps: creates the `WorkflowExecution` (`PENDING`), sets `RUNNING` + `startedAt`, executes each step in order writing one `ExecutionLog` per step, then sets `COMPLETED` + `completedAt` (+ an `output` summary).
3. On a step error, execution stops, status is set to `FAILED`, `completedAt` is set, and an `ERROR`-level `ExecutionLog` captures the failure.
4. `workflows.getExecution` returns a single execution with its ordered logs; `workflows.listExecutions({ workflowId })` returns run history (newest first) for a workflow the caller owns.
5. Authorization uses the **workflow `userId` owner** rule (as the existing `execute` does — `where: { id, userId }`), NOT the tasks `assigneeId` pattern. `execute`, `getExecution`, and `listExecutions` all enforce owner-only access.
6. Frontend: the "New Workflow" button opens a form wired to `workflows.create` (name, description, definition JSON) with client-side validation + error surfacing.
7. Frontend: each workflow card has a **Run** button wired to `workflows.execute` with a running/disabled state; the hardcoded mock template cards are removed (or converted into real "prefill the create form" templates).
8. Frontend: an execution history panel per workflow showing each run's status + per-step logs (via `getExecution`/`listExecutions`).
9. Router tests (Vitest, `createCaller` + mocked prisma): execute happy-path (status PENDING→RUNNING→COMPLETED + logs written), execute failure-path (FAILED + error log), invalid-definition rejection, and owner-only enforcement on `execute`/`getExecution`.

## Tasks / Subtasks

- [x] **Definition schema + validation** (AC: #1)
  - [x] Added zod `definitionSchema` (steps of `log`/`noop`); `parseDefinition` (JSON.parse + safeParse) validates in `create` → `BAD_REQUEST` on invalid JSON or unknown action.
- [x] **Execution engine** (AC: #2, #3)
  - [x] Rewrote `execute`: `PENDING` → `RUNNING` + `startedAt` → one `executionLog` per step → `COMPLETED` + `completedAt` + `output`.
  - [x] try/catch → on throw sets `FAILED` + `completedAt` + best-effort `ERROR` log. Synchronous (no queue/worker).
- [x] **Read procedures** (AC: #4, #5)
  - [x] `getExecution({ id })` — includes ordered `logs`; owner-checked via `execution.workflow.userId`.
  - [x] `listExecutions({ workflowId })` — `assertWorkflowOwner` then `orderBy createdAt desc`.
- [x] **Frontend: create + run** (AC: #6, #7)
  - [x] "New Workflow" form (name/description/definition JSON, prefilled sample) wired to `workflows.create`; invalidate `list`. Removed the hardcoded template cards (real empty state now).
  - [x] Run button per card wired to `workflows.execute` with spinner state.
- [x] **Frontend: execution history** (AC: #8)
  - [x] Per-card "Runs" panel (`listExecutions`) with status pills; each run expands to its logs (`getExecution`), ERROR steps highlighted.
- [x] **Tests** (AC: #9)
  - [x] `apps/web/src/server/api/routers/__tests__/workflows.test.ts` — 9 tests (invalid-JSON/unknown-action reject, create ok, execute PENDING→RUNNING→COMPLETED + logs, failure→FAILED+ERROR log, not-owner reject, getExecution owner/forbidden, listExecutions). All green.

## Dev Notes

### Guardrails (mirror existing patterns)

- **Ownership = `userId`.** Workflows are owned via `Workflow.userId`. The existing `execute` uses `findFirst({ where: { id, userId } })` → `NOT_FOUND` if not owned. Reuse this for the new read/execute procedures. Do NOT copy the tasks `assigneeId` + ADMIN pattern — workflows have no assignee.
- **Router is already registered** in `root.ts` as `workflows`; extend `workflowsRouter` in place.
- **`protectedProcedure`** already enforces auth; only add the per-workflow owner check.
- **Enums** are Prisma enums: `ExecutionStatus { PENDING, RUNNING, COMPLETED, FAILED, CANCELLED }`, `LogLevel { INFO, WARN, ERROR, DEBUG }`. Use these exact values.
- **`definition` is a `String` column** — store JSON as a string; parse on execute. Do not change the column type.
- **Testing** mirrors `tasks.test.ts` / `notifications.test.ts`: `workflowsRouter.createCaller(ctx)` with a mocked `prisma` exposing `workflow`, `workflowExecution`, `executionLog` methods. Assert status transitions by checking the sequence of `workflowExecution.update` calls, and log writes via `executionLog.create` calls.

### Stack (pinned — same as 5.1)

Next 15.5 / React 19 / tRPC 11 / TanStack Query 5 / Prisma 6.1 / next-auth v5-beta / Vitest 4. `@arko/ui` (`Card`, `CardHeader`, `CardContent`, `CardTitle`, `Button`), `lucide-react`. `AGENTS.md`: consult `node_modules/next/dist/docs/` for non-standard App Router behavior.

### Project Structure Notes

- Backend: `apps/web/src/server/api/routers/workflows.ts` (extend).
- Frontend: `apps/web/src/app/dashboard/workflows/page.tsx` (currently lists only; add create form, Run, history — a co-located detail component is fine).
- Schema already has all needed models — **no migration expected** (unlike 5.1). If you add fields, stage the migration and do NOT apply it (Supabase is the live DB; migrations run from a machine with IPv6/direct DB egress).

### References

- [Source: _bmad/planning/sprint-5-epic.md#Story 5.2] — epic AC + P0 priority.
- [Source: apps/web/src/server/api/routers/workflows.ts] — stub `execute`, `userId` ownership pattern.
- [Source: apps/web/src/app/dashboard/workflows/page.tsx] — list-only page, dead "New Workflow" button, hardcoded template cards.
- [Source: packages/db/prisma/schema.prisma] — `Workflow`, `WorkflowExecution`, `ExecutionLog`, `ExecutionStatus`, `LogLevel`.
- [Source: apps/web/src/server/api/routers/tasks.ts] — reference for procedure structure + test style (but different ownership column).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (dev-story workflow)

### Debug Log References

- RED: `vitest run workflows.test.ts` → 7/9 failing (missing procedures / stub behavior) before implementation.
- GREEN: after engine implementation → 9/9 passing.
- Full suite: `vitest run` → 9 files / 41 tests passing (no regressions).
- Typecheck: `tsc --noEmit` → exit 0.

### Completion Notes List

- Replaced the stub `execute` (which only wrote a `PENDING` row) with a real synchronous engine: status progression PENDING→RUNNING→COMPLETED/FAILED, one `ExecutionLog` per step, `startedAt`/`completedAt`/`output` populated.
- Minimal typed step model (`log`/`noop`) validated on `create` and re-validated on `execute`. Deliberately small per the story's scope guard.
- Ownership uses the workflow `userId` owner rule (`assertWorkflowOwner`), distinct from the tasks `assigneeId` pattern.
- Frontend: wired the previously-dead "New Workflow" button (create form), added Run + per-card execution history with expandable logs, and removed the hardcoded mock template cards.
- **No migration** — schema already had `WorkflowExecution`/`ExecutionLog`.
- ⚠️ Unit-tested (mocked Prisma) + typechecked, but **not verified against a live DB or in the browser**. No commits yet (branch `feat/5-2-workflow-execution-engine`, stacked on 5-1).

### File List

- `apps/web/src/server/api/routers/workflows.ts` (modified — definition schema, real `execute` engine, `getExecution`, `listExecutions`, owner helper)
- `apps/web/src/server/api/routers/__tests__/workflows.test.ts` (new — 9 tests)
- `apps/web/src/app/dashboard/workflows/page.tsx` (modified — create form, Run, execution history, removed mock templates)

## Change Log

| Date | Change |
|---|---|
| 2026-07-23 | Implemented Story 5.2 — real workflow execution engine + UI (create/run/history). No migration. Status → review. |
| 2026-07-23 | Adversarial code review — fixed 4 findings (1 High, 3 Med): test assertions, bounded sync engine, dropped inert `input`, added workflow edit/delete. +5 tests (46 total). Status → done. |

## Tasks/Subtasks — Review Follow-ups (AI)

- [ ] [AI-Review][Low] Tighten `any` types in the router helpers (`assertWorkflowOwner`, `parseDefinition` ctx) — `apps/web/src/server/api/routers/workflows.ts`.
- [ ] [AI-Review][Low] Future: move execution off the request thread (queue/worker) if step types grow beyond `log`/`noop` or become slow — currently bounded synchronous (`MAX_STEPS = 200`).

## Senior Developer Review (AI)

**Reviewer:** claude-opus-4-8 (adversarial code-review workflow)
**Date:** 2026-07-23
**Outcome:** Approved with fixes applied (1 High + 3 Medium resolved; 1 Low + 1 future note deferred)

### Findings & Resolution

- [x] **[High] AC #2 partially unverified** — tests checked status sequence + log count but not that `startedAt`/`completedAt`/`output` were populated. **Fixed:** happy-path test now asserts all three.
- [x] **[Med] Unbounded synchronous execution** — whole workflow ran in the request with no cap. **Fixed:** `definitionSchema` caps steps at `MAX_STEPS = 200`; limitation documented in code + deferred as a future async-infra follow-up.
- [x] **[Med] Inert `input` param** — `execute` accepted an `input` it never used. **Fixed:** removed from the procedure input and the persisted data.
- [x] **[Med] No edit/delete for workflows** — could create/run but not modify/remove. **Fixed:** added `workflows.update` (validates definition, owner-checked) and `workflows.delete` (owner-checked, executions/logs cascade), with UI (edit form + two-step delete) and 4 new tests.

### Deferred (Low — see Review Follow-ups above)

- `any` types in router helpers.
- Async execution infrastructure (only needed if the step model grows).

### Gate note

Code complete, typechecks, 46 passing tests. ⚠️ Still **not verified against a live DB or in the browser** — no migration for this story, so it can be exercised locally as soon as the app runs; do a manual create → run → view-logs pass before treating as shippable.
