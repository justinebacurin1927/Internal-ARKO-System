# Story 5.3: Task Comments — Surface the UI

**Epic:** Sprint 5 — Migration Gap Closure
**Status:** backlog
**Effort:** 2 days
**Priority:** P1 — backend complete, no UI

## Description

The `comments` router is complete (`create`, `list`, `update`, `delete`) and the
`Comment` model exists, but no page renders comments. Surface comment threads on tasks
(the generic `resourceType`/`resourceId` design supports other resources later).

## Acceptance Criteria

- [ ] Frontend: comment thread component in the task detail drawer/modal
- [ ] Frontend: list comments via `comments.list` (chronological), author avatar + name + relative time
- [ ] Frontend: add comment via `comments.create` with optimistic update / invalidate
- [ ] Frontend: edit own comment via `comments.update`; delete via `comments.delete` (confirm dialog)
- [ ] Frontend: comment count badge on the Kanban card
- [ ] Backend: verify `comments` procedures enforce author ownership on update/delete
- [ ] Backend: (optional) notification trigger on new comment for task assignee
- [ ] Tests: component renders list + create/edit/delete happy paths
