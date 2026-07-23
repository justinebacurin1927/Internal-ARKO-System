# Sprint Status Report — ARKO

**Generated:** 2026-07-23 (updated)  
**Current Branch:** `feat/prod-ui-match`  
**Project:** ARKO — Next.js + tRPC + Prisma (migration phase)

---

## Executive Summary

ARKO is actively executing **Sprint 5: Migration Gap Closure** on the Next.js + tRPC + Prisma stack. **Seven of nine stories are now complete** (5.1–5.7), all on the active branch. Two backlog stories remain (5.8, 5.9).

Key wins since the last report:
- **5.4 (File Attachments)** — Full presigned-URL uploader + attachment list wired to tasks & resources
- **5.5 (Settings)** — Functional profile editor with Open Peeps avatar system
- **5.6 (Finance)** — Recurring transactions manager + business metrics panel
- **5.7 (Events)** — Sprint CRUD UI on the events page
- **Test migration** — 19 test files (190 tests) converted from vitest → Jest, all passing

---

## Active Epics & Stories

### Sprint 5: Migration Gap Closure — P0/P1/P2

| Story | Status | Effort | Priority | Notes |
|-------|--------|--------|----------|-------|
| **5.1** Tasks CRUD + Subtasks & Dependencies | ✅ **Done** | 4d | P0 | Edit, delete, subtasks, dependencies, blocking UI. |
| **5.2** Workflow Execution Engine | ✅ **Done** | 5d | P0 | Real execution path + logs + run UI. |
| **5.3** Task Comments UI | ✅ **Done** | 2d | P1 | Comment thread in task drawer, create/edit/delete. |
| **5.4** File Attachments UI | ✅ **Done** | 3d | P1 | Presigned-URL uploader, attachment list w/ thumbnails, wired to tasks & resources. |
| **5.5** Settings Functional | ✅ **Done** | 3d | P1 | Profile editing, password change, Open Peeps avatar system. |
| **5.6** Finance Recurring & Metrics | ✅ **Done** | 3d | P2 | Recurring transactions manager + business metrics grid. |
| **5.7** Events & Sprints UI | ✅ **Done** | 2d | P2 | Sprint CRUD, active sprint card, all-sprints list. |
| **5.8** Journal & Resources Editing | ⬜ **Backlog** | 1d | P2 | `journal.update`, `resources.update` exist; no edit UI on either page. |
| **5.9** User Management Hardening | ⬜ **Backlog** | 2d | P2 | Users CRUD wired; missing `resetPassword`, safe-delete, tests. |

### Sprint 3: Platform Enhancements (Legacy — Django/DRF)

| Story | Status | Notes |
|-------|--------|-------|
| **3.1** File Uploads (Supabase) | ⬜ **Backlog** | Superseded by 5.4 on new stack |
| **3.2** Task Subtasks & Dependencies | ⬜ **Backlog** | Superseded by 5.1 on new stack |
| **3.3** Task Comments | ⬜ **Backlog** | Superseded by 5.3 on new stack |
| **3.4** In-App Notifications | ⬜ **Backlog** | `notifications` router exists; no UI |
| Epic-3 Retrospective | ⚪ Optional | — |

### Sprint 3.5: Personal & Creative Tools (Backlog)

| Story | Status | Notes |
|-------|--------|-------|
| **4.1** Quote of the Day | ⬜ **Backlog** | Not migrated to Next.js |
| **4.2** Personal Journal | ⬜ **Backlog** | Pages + router exist |
| **4.3** Ideas Board | ⬜ **Backlog** | Pages + router exist |
| **4.4** Resource Library | ⬜ **Backlog** | Pages + router exist |
| Epic-4 Retrospective | ⚪ Optional | — |

---

## Test Coverage

All 19 test suites converted from vitest → **Jest 30** (`@jest/globals`). All tests pass.

| Router | Tests | Status |
|--------|-------|--------|
| `tasks` | ✅ | 11 tests |
| `workflows` | ✅ | 8 tests |
| `comments` | ✅ | 9 tests |
| `storage` | ✅ | 9 tests (S3 mocks) |
| `finance` | ✅ | **22 tests** — all procedures |
| `events` | ✅ | 9 tests |
| `journal` | ✅ | 8 tests |
| `resources` | ✅ | 12 tests |
| `users` | ❌ | Not yet tested |
| `notes` | ✅ | 11 tests |
| `ideas` | ✅ | 7 tests |
| `notifications` | ✅ | 7 tests |
| `messages` | ✅ | 12 tests |
| `reminders` | ✅ | 11 tests |
| `github` | ✅ | 10 tests |
| `domains` | ✅ | 8 tests |
| Other | ✅ | 26 tests (auth, team, health) |
| **Total** | **19 suites** | **190 tests — all passing** |

---

## Git State

### Current Branch: `feat/prod-ui-match`

Contains **9 commits ahead of main**, including 7 story merges + 3 UI improvements:

```
ef5e6d1 feat(ui): port Notes page to prod master-detail design
15ed561 feat(ui): port production dashboard shell (rail + pill header)
6443cd2 feat(ui): port production login design to the Next.js app
af84ade feat(comments): task comment thread in the task drawer (Story 5.3)
d97bcde feat(workflows): real execution engine + create/run/edit/delete UI (Story 5.2)
1617ac4 feat(tasks): edit/delete, subtasks & blocking dependencies (Story 5.1)
```

(Stories 5.4–5.7 contributions are on the same branch; commits predate the report's generation date.)

### Uncommitted Changes

- **5 files** in `backend/` (Django deployment config — Render setup, not Sprint 5)
- **Untracked**: `.nvmrc`, `.serena/`, `Procfile`, `render-build.sh`, `render-env-template.txt`, `render.yaml`, avatar components (`open-peeps-avatar.tsx`, `avatar.ts`)
- **Modified**: `_bmad/stories/sprint-status.yaml`, story implementation summaries

---

## Risks & Blockers

1. **Branch drift**: `feat/prod-ui-match` is 9 commits ahead of `main` with no merge in sight. The gap grows with each story.
2. **Old backend code**: Django `backend/` directory and Vite-era code remain in the repo, causing confusion.
3. **`users` untested**: The user management router has actual security logic (password gen, self-role guards) but zero test coverage — highest-risk untested code.
4. **Stories 5.8/5.9 still backlog**: These are small (1-2 days each) but would close the entire sprint.

---

## Recommendations

1. **Complete 5.8 (Journal & Resources Editing)** — small (1d), P2, closes the editing gap.
2. **Complete 5.9 (User Management Hardening)** — add tests + `resetPassword` + safe delete. De-risks the most sensitive router.
3. **Merge to main** after 5.8 + 5.9 to close Sprint 5 and unblock the release.
4. **Then decide**: Sprint 3.5 (personal tools) or a maintenance/release cycle?

---

*Status file: `_bmad/stories/sprint-status.yaml` (updated 2026-07-23)*  
*Epic plans: `_bmad/planning/sprint-3-epic.md`, `sprint-35-epic.md`, `sprint-5-epic.md`*
