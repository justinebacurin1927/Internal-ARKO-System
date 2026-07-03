# Story 4.4: Resource Library

**Epic:** Sprint 3.5 — Personal & Creative Tools
**Status:** backlog
**Effort:** 3 days

## Description

A shared knowledge library for storing useful links and reference files. Team-visible, organized by tags.

## Acceptance Criteria

- [ ] Backend: `Resource` model — title, url (nullable), description, type (link|file), file (nullable, reuses 3.1 upload infra), author, tags, timestamps
- [ ] Backend: Link preview — auto-fetch og:title, og:description from URL
- [ ] Backend: `Tag` model — name, color (hex), reusable across resources
- [ ] API: Full CRUD for resources, filter by tag/type/search
- [ ] API: `GET /api/tags/` — list tags with usage count
- [ ] Frontend: Grid view at `/resources` with link/file cards
- [ ] Frontend: Add resource modal (URL or file upload), tag picker
- [ ] Frontend: Tag filter bar, search bar, pagination
- [ ] Frontend: Link cards show favicon + domain
- [ ] Frontend: Empty state with CTA
