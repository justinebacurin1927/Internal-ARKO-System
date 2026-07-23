# Story 5.3: Task Comments — Surface the UI

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a team member using ARKO,
I want to read and post comments on a task,
so that discussion lives with the work instead of being lost in chat.

## Context & Problem

The `comments` tRPC router (`apps/web/src/server/api/routers/comments.ts`) is **complete and
registered** — `list`, `create`, `update` (owner-only, sets `edited: true`), `delete`
(owner-only) — using a generic `resourceType` + `resourceId` pair (no per-model FK). The
`Comment` model exists. But **no page renders comments anywhere**. This story surfaces a
comment thread on tasks; the generic design means the same component can later serve notes,
ideas, etc.

**Integration point (already built):** Story 5.1 added a `TaskDetail` slide-over drawer in
`apps/web/src/app/dashboard/tasks/page.tsx`. Comments go **inside that drawer** — do not build
a new detail surface.

**Known constraint (design around it):** `Comment` has **no FK relation to `Task`** (it keys
on `resourceType='TASK'` + `resourceId=task.id`). So a per-card "comment count" badge cannot use
a Prisma `_count` on `tasks.list`. See AC #6 for the decision.

## Acceptance Criteria

1. The `TaskDetail` drawer shows a "Comments" section listing comments via `comments.list({ resourceType: 'TASK', resourceId: task.id })`, oldest→newest, each with author name/avatar and relative timestamp; "(edited)" shown when `edited` is true.
2. A composer posts a new comment via `comments.create`; on success the thread refreshes (`utils.comments.list.invalidate({ resourceType, resourceId })`).
3. The author can edit their own comment inline via `comments.update`; non-authors see no edit control (server already enforces `FORBIDDEN`).
4. The author can delete their own comment via `comments.delete`, guarded by the drawer's inline confirm pattern (no native `confirm()` — match 5.1).
5. Loading and empty states are handled ("No comments yet"); errors surface via the drawer/page notice pattern (no `alert()`).
6. Comment count badge on the Kanban card: **decide and document** — either (a) defer the badge (recommended for this story, since `Comment` has no FK to `Task`), or (b) add a batched count procedure (`comments.countsFor({ resourceType, resourceIds })`) and use it. Do NOT do a per-card `comments.list` query (N queries).
7. `resourceType` string convention is `'TASK'` (matches the schema comment `'TASK' | 'NOTE' | 'IDEA'`); centralize the literal so it isn't stringly-duplicated.
8. Tests: add `comments` router tests (currently none) — `list`, `create`, owner-only `update`/`delete` (FORBIDDEN for non-author) via `createCaller` + mocked prisma. (Component tests are out of scope — repo has no component-test setup.)

## Tasks / Subtasks

- [x] **Comments router tests** (AC: #8)
  - [x] `comments.test.ts` — list returns thread; create sets `userId` from ctx; update sets `edited: true`; update/delete reject non-author with `FORBIDDEN`. 6 tests, all green.
- [x] **CommentThread component** (AC: #1, #2, #3, #4, #5)
  - [x] New `apps/web/src/app/dashboard/tasks/comment-thread.tsx` taking `resourceType` + `resourceId` + `onError`.
  - [x] List (`comments.list`), composer (`comments.create` + invalidate, Enter-to-post), inline edit (`comments.update`), delete with the 5.1 two-step inline confirm.
  - [x] Author-only controls via `useSession()` → `session?.user?.id` (mirrors messages/users pages); server enforces regardless.
  - [x] Loading / empty states; errors surface via the page notice (`onError` → `setNotice`). Avatar + relative time + "(edited)".
- [x] **Wire into TaskDetail** (AC: #1, #7)
  - [x] Renders `<CommentThread resourceType={TASK_RESOURCE} resourceId={task.id} onError={onError} />` in the drawer (below dependencies, above delete).
  - [x] `TASK_RESOURCE = 'TASK'` const defined once at the top of the page.
- [x] **Comment count badge decision** (AC: #6)
  - [x] Deferred — documented with a JSX comment at the card badge site (Comment has no FK to Task; a per-card count needs a batched proc, out of scope).

## Dev Notes

### Guardrails (mirror existing patterns)

- **Ownership = `comment.userId`.** `update`/`delete` already throw `FORBIDDEN` for non-authors — the UI should hide those controls for others but must not assume it's the only guard.
- **Generic resource keying:** `list`/`create` take `{ resourceType, resourceId }`. For tasks: `resourceType: 'TASK'`, `resourceId: task.id`. No FK exists — do not try to `include` comments on `tasks.list`.
- **Invalidation:** `comments.list` is keyed by `{ resourceType, resourceId }`; invalidate with the same input object after create/update/delete (see how the tasks page uses `utils.<router>.<proc>.invalidate`).
- **Current user id:** the drawer needs the session user id to decide which comments are editable. `next-auth` session is available server-side; on the client, source the id consistently with how other pages do it (check `api.users.search`/session usage) rather than inventing a new pattern.
- **No native dialogs:** reuse the 5.1 inline notice + two-step delete confirm — do not introduce `alert()`/`confirm()`.

### Stack (pinned — same as 5.1/5.2)

Next 15.5 / React 19 / tRPC 11 / TanStack Query 5 / Prisma 6.1 / next-auth v5-beta / Vitest 4. `@arko/ui` (`Card`, `Button`, `Avatar`), `lucide-react`, Tailwind.

### Project Structure Notes

- Backend (no change expected): `apps/web/src/server/api/routers/comments.ts`.
- Frontend: `apps/web/src/app/dashboard/tasks/page.tsx` (the `TaskDetail` drawer from 5.1) + a new `CommentThread` component.
- No migration (Comment model already exists).

### References

- [Source: _bmad/planning/sprint-5-epic.md#Story 5.3] — epic AC.
- [Source: apps/web/src/server/api/routers/comments.ts] — complete CRUD, owner-only edit/delete.
- [Source: apps/web/src/app/dashboard/tasks/page.tsx] — `TaskDetail` drawer (5.1) = integration point; inline notice + two-step delete patterns to reuse.
- [Source: packages/db/prisma/schema.prisma] — `Comment { content, edited, userId, resourceType, resourceId }`, `@@index([resourceType, resourceId])`, no Task FK.
- [Source: apps/web/src/server/api/routers/__tests__/tasks.test.ts] — router test pattern to mirror for comments.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (dev-story workflow)

### Debug Log References

- `comments.test.ts` → 6/6 pass (characterizes the existing, previously-untested router).
- Full suite: `vitest run` → 10 files / 52 tests pass (no regressions).
- Typecheck: `tsc --noEmit` → exit 0.

### Completion Notes List

- Surfaced the orphaned comments backend as a `CommentThread` component inside the 5.1 `TaskDetail` drawer (`resourceType='TASK'`, `resourceId=task.id`).
- Author-only edit/delete via `useSession()` client-side (matches messages/users pages); server already enforces `FORBIDDEN`, so the UI check is cosmetic-safe.
- Reused 5.1 conventions: page-level inline notice for errors (no `alert()`), two-step inline delete confirm (no `confirm()`).
- Added the missing `comments` router tests (the backend had none).
- Comment-count badge deferred by design — `Comment` has no FK to `Task`, so a per-card count would need a batched count procedure; documented at the call site.
- No migration (Comment model already existed). ⚠️ Unit-tested + typechecked, **not browser-verified**.
- Component behavior (rendering, session-based controls) is not covered by automated tests — repo has no component-test setup; verify manually.
- No commits yet (branch `feat/5-3-task-comments-ui`, stacked on 5-2).

### File List

- `apps/web/src/server/api/routers/__tests__/comments.test.ts` (new — 6 tests)
- `apps/web/src/app/dashboard/tasks/comment-thread.tsx` (new — CommentThread component)
- `apps/web/src/app/dashboard/tasks/page.tsx` (modified — import + `TASK_RESOURCE`, `onError` prop threaded to `TaskDetail`, `CommentThread` rendered in drawer, deferred-badge comment)
- `apps/web/src/server/api/routers/comments.ts` (modified in review — added `.max(2000)` to create/update content)

## Change Log

| Date | Change |
|---|---|
| 2026-07-23 | Implemented Story 5.3 — task comments UI (CommentThread in the task drawer) + comments router tests. No migration. Status → review. |
| 2026-07-23 | Adversarial code review — fixed 3 Medium findings (multiline textarea, maxLength client+server, disable-empty-submit). 52 tests green. Status → done. |

## Tasks/Subtasks — Review Follow-ups (AI)

- [ ] [AI-Review][Low] Decide whether comments need ADMIN moderation — backend `comments.update`/`delete` are strictly owner-only (no ADMIN bypass, unlike tasks). Product call.
- [ ] [AI-Review][Low] The `TaskDetail → CommentThread` integration + component rendering have no automated coverage (repo has no component-test setup); consider adding a component test harness.
- [ ] [AI-Review][Low] `relTime` is computed at render and won't tick without a re-render — acceptable, revisit if live timestamps are wanted.

## Senior Developer Review (AI)

**Reviewer:** claude-opus-4-8 (adversarial code-review workflow)
**Date:** 2026-07-23
**Outcome:** Approved with fixes applied (3 Medium resolved; 3 Low deferred as follow-ups)

### Findings & Resolution

- [x] **[Med] Single-line input for multi-line comments** — thread rendered `whitespace-pre-wrap` but compose/edit were `<input>` with Enter submitting. **Fixed:** both are now `<textarea>` — Enter submits, Shift+Enter inserts a newline.
- [x] **[Med] No max length on content** — server was `min(1)` only. **Fixed:** `maxLength={2000}` on both textareas and `.max(2000)` on `comments.create`/`update` inputs.
- [x] **[Med] Silent no-op on empty submit** — `content.trim() && mutate` gave no feedback. **Fixed:** Post and Save buttons are disabled when the field is empty/whitespace.

### Deferred (Low — see Review Follow-ups above)

- Admin moderation of comments (backend owner-only).
- Component/integration test coverage (no harness in repo).
- Static relative timestamps.

### Gate note

Typechecks + 52 passing tests. ⚠️ Not browser-verified and the component itself is untested (no component-test setup) — do a manual post/edit/delete pass before treating as shippable.
