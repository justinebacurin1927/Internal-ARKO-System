# Story 4.1: Quote of the Day

**Epic:** Sprint 3.5 — Personal & Creative Tools
**Status:** backlog
**Effort:** 1 day

## Description

Display an inspirational quote on the dashboard that changes daily. Admins can manage the quote pool via the Django admin panel.

## Acceptance Criteria

- [ ] Backend: `Quote` model — text (required), author (optional), category (optional), is_active
- [ ] Backend: Management command `load_sample_quotes` to seed ~50 curated quotes
- [ ] Backend: Admin registration — searchable, filterable by category
- [ ] API: `GET /api/quotes/daily/` — deterministic quote for the current date
- [ ] API: `GET /api/quotes/random/` — random quote for refresh
- [ ] Frontend: Dashboard widget — subtle card, quote in italics, author attribution
- [ ] Frontend: Fade-in animation, collapsible, "New quote" button
- [ ] Migration: Create Quote model + seed data
