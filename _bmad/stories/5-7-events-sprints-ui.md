# Story 5.7: Events — Sprints UI

**Epic:** Sprint 5 — Migration Gap Closure
**Status:** backlog
**Effort:** 2 days
**Priority:** P2 — capability exists, not surfaced

## Description

The `events` router has full sprint procedures (`createSprint`, `listSprints`,
`updateSprint`, `deleteSprint`) and a `Sprint` model, but the events page only handles
events. Add a sprints view/section.

## Acceptance Criteria

- [ ] Frontend: sprints list/section on the events page wired to `listSprints`
- [ ] Frontend: create/edit/delete sprint wired to the sprint procedures
- [ ] Frontend: associate events with a sprint if the schema relates them (verify relation first)
- [ ] Tests: sprint CRUD wiring
