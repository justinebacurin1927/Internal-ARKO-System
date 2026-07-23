# Story 5.8: Journal & Resources — Editing

**Epic:** Sprint 5 — Migration Gap Closure
**Status:** backlog
**Effort:** 1 day
**Priority:** P2 — capability exists, not surfaced

## Description

`journal` (`get`, `update`) and `resources` (`update`) expose edit procedures that no
page calls — entries/resources can be created and deleted but not edited. Wire edit UI.

## Acceptance Criteria

- [ ] Frontend: edit an existing journal entry via `journal.update` (load via `journal.get`)
- [ ] Frontend: edit an existing resource via `resources.update`
- [ ] Frontend: edit affordance (button/menu) on each journal/resource item
- [ ] Tests: edit happy path for both
