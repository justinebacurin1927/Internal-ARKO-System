# Story 4.2: Personal Journal

**Epic:** Sprint 3.5 — Personal & Creative Tools
**Status:** backlog
**Effort:** 3 days

## Description

A private daily journal where each user can write personal notes, reflections, or log their day. Entries are strictly user-scoped.

## Acceptance Criteria

- [ ] Backend: `JournalEntry` model — user, date, title, content (markdown), mood emoji, timestamps
- [ ] Backend: UniqueConstraint on (user, date) — one entry per day
- [ ] Backend: All queries filtered to `request.user` — enforced at viewset level
- [ ] API: CRUD endpoints for journal entries
- [ ] API: `GET /api/journal/today/` — shortcut for today's entry
- [ ] API: `GET /api/journal/calendar/?month=2026-07` — dates with entries
- [ ] Frontend: Journal page with calendar heatmap
- [ ] Frontend: Markdown editor with preview, mood selector
- [ ] Frontend: Private icon on nav item, entry streak indicator
