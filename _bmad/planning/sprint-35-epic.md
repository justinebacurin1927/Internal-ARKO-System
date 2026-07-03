---
title: Sprint 3.5 — Personal & Creative Tools
epic: 4
status: backlog
created: 2026-07-04
---

# Epic 4: Sprint 3.5 — Personal & Creative Tools

**Status:** Backlog
**Target:** 4 features — quote of the day, personal journal, R&D ideas board, resource library

## Overview

While Sprint 3 (Epic 3) focuses on team-scale infrastructure (uploads, subtasks, comments, notifications), this follow-on epic adds the personal and creative side of ARKO: daily inspiration, private journaling, idea incubation, and a shared knowledge library.

These features are lighter-weight and independent — they can be built in any order once Sprint 3 stories are delivered.

---

## Story 4.1: Quote of the Day

**Status:** backlog
**Effort:** 1 day

### Description

Display an inspirational quote on the dashboard that changes daily. Admins can manage the quote pool via the Django admin panel.

### Acceptance Criteria

- [ ] Backend: `Quote` model — text (required), author (optional), category (optional, e.g. "productivity", "creativity", "leadership"), is_active
- [ ] Backend: Management command `load_sample_quotes` to seed ~50 curated quotes
- [ ] Backend: Admin registration — searchable, filterable by category
- [ ] API: `GET /api/quotes/daily/` — returns deterministic quote for the current date (seeded random based on date, so all users see the same quote per day)
- [ ] API: `GET /api/quotes/random/` — returns a random quote (for refresh/shuffle)
- [ ] Frontend: Dashboard widget — subtle card, quote text in italics, author attribution
- [ ] Frontend: Fade-in animation on load
- [ ] Frontend: "New quote" button → fetches random quote (doesn't change daily one)
- [ ] Frontend: Collapsible — can hide the widget if preferred
- [ ] Migration: Create Quote model, seed initial data via data migration

---

## Story 4.2: Personal Journal

**Status:** backlog
**Effort:** 3 days

### Description

A private daily journal where each user can write personal notes, reflections, or log their day. Entries are strictly user-scoped — nobody else can read them.

### Acceptance Criteria

- [ ] Backend: `JournalEntry` model — user (FK), date, title, content (markdown), mood (emoji picker: 😊 😐 😢 🔥 💡), created_at, updated_at
- [ ] Backend: UniqueConstraint on (user, date) — one entry per day per user (allow PATCH to update)
- [ ] Backend: All queries filtered to `request.user` — enforced in the viewset, not just the queryset default
- [ ] API: `GET /api/journal/` — list entries (paginated, newest first)
- [ ] API: `POST /api/journal/` — create entry (date defaults to today)
- [ ] API: `GET /api/journal/:id/` — detail (404 if not owner)
- [ ] API: `PATCH /api/journal/:id/` — update today's entry
- [ ] API: `GET /api/journal/today/` — shortcut to get or create today's entry
- [ ] API: `GET /api/journal/calendar/?month=2026-07` — returns which dates have entries (lightweight, no content)
- [ ] Frontend: Journal page at `/journal` with calendar heatmap (dates with entries highlighted)
- [ ] Frontend: Click date → view entry for that day (or create if empty)
- [ ] Frontend: Markdown editor (reuse existing note editor) with preview toggle
- [ ] Frontend: Mood selector (emoji row) at top of entry
- [ ] Frontend: Lock/private icon on the nav item so it's clearly personal
- [ ] Frontend: Entry count streak indicator — "7 days in a row!"

---

## Story 4.3: R&D / Ideas Board

**Status:** backlog
**Effort:** 4 days

### Description

An idea incubation space where team members can brainstorm, capture concepts, and evolve them into real tasks. Ideas flow through a status pipeline (new → exploring → prototyping → shipped/abandoned).

### Acceptance Criteria

- [ ] Backend: `Idea` model — title, description (markdown), author (FK User), status (new | exploring | prototyping | shipped | abandoned), tags (ArrayField or M2M), created_at, updated_at
- [ ] Backend: Optional FK to Task — when an idea spawns a task, link it
- [ ] Backend: Validation — idea can only link to tasks the user can see
- [ ] API: Full CRUD — `GET/POST/PATCH/DELETE /api/ideas/`
- [ ] API: `GET /api/ideas/:id/tasks/` — list tasks spawned from this idea
- [ ] API: Filtering — by status, by tag, by author
- [ ] Frontend: Ideas board at `/ideas` — Kanban-like columns by status (New, Exploring, Prototyping, Shipped, Abandoned)
- [ ] Frontend: Idea card — title, author avatar, tag pills, status badge, created date
- [ ] Frontend: Create idea modal — title, description, tags (typeahead)
- [ ] Frontend: Idea detail page — full description, linked tasks list, activity timeline
- [ ] Frontend: "Spawn Task" button on idea detail → creates a new task with auto-link back to the idea
- [ ] Frontend: When viewing a task, show "Originated from idea #X" if linked
- [ ] Frontend: Drag ideas between status columns (optional for v1 — use dropdown instead)
- [ ] E2E: Create idea → spawn task → verify task shows the idea link

---

## Story 4.4: Resource Library

**Status:** backlog
**Effort:** 3 days

### Description

A shared knowledge library for storing useful links and reference files. Think of it as bookmarks + file storage combined, organized by tags and categories. Team-visible (not private — that's the Journal's role).

### Acceptance Criteria

- [ ] Backend: `Resource` model — title, url (nullable), description, type (link | file), file (FileField, nullable), author (FK User), tags (ArrayField or M2M), created_at, updated_at
- [ ] Backend: If type=file, reuse upload infrastructure from Story 3.1 (Supabase/MinIO)
- [ ] Backend: If type=link, store just the URL with preview metadata (auto-fetch og:title, og:description from URL)
- [ ] Backend: Tag model — name, color (hex) — reusable across resources
- [ ] API: Full CRUD — `GET/POST/PATCH/DELETE /api/resources/`
- [ ] API: `GET /api/resources/?tag=python` — filter by tag
- [ ] API: `GET /api/resources/?type=link` — filter by type
- [ ] API: `GET /api/resources/?search=django` — search title + description
- [ ] API: `GET /api/tags/` — list all tags with usage count
- [ ] Frontend: Resource library page at `/resources` — grid view (cards for links, thumbnails for files)
- [ ] Frontend: Resource card — icon (link vs file), title, description snippet, tag pills, author, date
- [ ] Frontend: Add resource modal — title, URL or file upload, description, tag picker
- [ ] Frontend: Tag filter bar — click tags to filter, multi-select
- [ ] Frontend: Search bar — real-time filter as you type
- [ ] Frontend: Link cards show the favicon + domain of the URL
- [ ] Frontend: Right-click / context menu → "Copy link", "Open in new tab"
- [ ] Frontend: Empty state illustration + CTA to add the first resource
- [ ] Frontend: Pagination or infinite scroll for large collections
