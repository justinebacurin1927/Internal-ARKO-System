# Story 3.2: Task Subtasks & Dependencies

**Epic:** Sprint 3 — Enhancements
**Status:** backlog
**Effort:** 4 days

## Description

Extend the Task model with parent-child relationships (subtasks) and task-to-task dependencies (blocked-by). Update the Kanban board to show subtask progress and dependency chains.

## Acceptance Criteria

- [ ] Backend: `parent` FK on Task model (self-referential, nullable)
- [ ] Backend: `depends_on` M2M on Task model (self-referential, symmetrical=False)
- [ ] Backend: Validation — no circular dependencies (A → B → A)
- [ ] Backend: Validation — a task cannot be its own parent or depend on itself
- [ ] Backend: API returns `subtasks: []` and `depends_on: [{id, title, status}]` in task detail
- [ ] Backend: When parent task is marked done, all subtasks must also be done (or warn)
- [ ] Backend: When a task is blocked by an incomplete dependency, its column auto-locks
- [ ] API: PATCH endpoint supports `parent` and `depends_on` updates
- [ ] Frontend: Subtask list in task detail drawer (checkbox, title, assignee mini-avatar)
- [ ] Frontend: Create subtask inline from task drawer
- [ ] Frontend: Dependency picker — search and select tasks (modal or typeahead)
- [ ] Frontend: Dependency indicator on Kanban card — "Blocked by: #42"
- [ ] Frontend: Subtask progress bar on parent card (e.g., "3/5 done")
- [ ] Frontend: Blocked tasks show visual indicator and cannot be dragged to Done
- [ ] E2E: Create parent → add subtask → complete subtask → verify parent shows progress
