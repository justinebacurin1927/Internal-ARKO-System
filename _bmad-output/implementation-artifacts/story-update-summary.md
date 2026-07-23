# Story Advancement — Sprint 5

**Date:** 2026-07-31
**Action:** `/bmad-create-story continue`

## Status Change

| Story | Status Before | Status After |
|-------|--------------|--------------|
| 5.7 Events & Sprints UI | done | done |
| **5.8 Journal & Resources Editing** | **backlog** | **ready-for-dev** |

## Next Story: Story 5.8 — Journal & Resources Editing

**Priority:** P2 | **Effort:** 1 day

### What needs to be done

- Add edit button/menu to journal entries → wire `journal.update`
- Add edit button/menu to resource items → wire `resources.update`
- Test: edit happy path for both

### Existing infra

- `journal.get` / `journal.update` procedures exist at `apps/web/src/server/api/routers/journal.ts`
- `resources.update` procedure exists at `apps/web/src/server/api/routers/resources.ts`
- Journal page at `apps/web/src/app/dashboard/journal/page.tsx`
- Resources page at `apps/web/src/app/dashboard/resources/page.tsx`

## Remaining

- Story 5.9 (User Management Hardening) — backlog
- Epic 5 retrospective — optional
