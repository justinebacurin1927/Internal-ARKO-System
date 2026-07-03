# Story 4.3: R&D / Ideas Board

**Epic:** Sprint 3.5 — Personal & Creative Tools
**Status:** backlog
**Effort:** 4 days

## Description

An idea incubation space where team members can brainstorm and evolve concepts into real tasks. Ideas flow through a status pipeline.

## Acceptance Criteria

- [ ] Backend: `Idea` model — title, description, author, status (new/exploring/prototyping/shipped/abandoned), tags, timestamps
- [ ] Backend: Optional FK to Task — link spawned tasks back to the idea
- [ ] API: Full CRUD, filtering by status/tag/author
- [ ] API: `GET /api/ideas/:id/tasks/` — tasks spawned from this idea
- [ ] Frontend: Kanban-like board by status at `/ideas`
- [ ] Frontend: Create idea modal, detail page with linked tasks
- [ ] Frontend: "Spawn Task" button on idea → creates linked task
- [ ] Frontend: Task detail shows "Originated from idea #X"
- [ ] E2E: Create idea → spawn task → verify link
