---
title: ARKO - Phase 1 Report
tags:
  - arko
  - phase1
  - mvp
created: 2026-06-28
---

ARKO — Internal Collaboration Platform

Phase 1 (MVP) Build & Run Report

*Prepared for: 4-person internal team*

*Date: 28 June 2026 | Status: Phase 1 complete & verified*

# 1. Overview

This report documents the first build run of ARKO, the internal collaboration platform scoped in [[ARKO - Scoping]]. Phase 1 (the MVP) consolidates task management, documentation, file storage, and comment-based communication into one tool for the 4-person team. All seven MVP features were implemented, the project builds cleanly, and the runtime-critical paths were verified against live services.

# 2. Technology Decisions

Four open questions from the scoping doc were resolved before building:

| Decision | Choice | Notes |
|---|---|---|
| Tech stack | Next.js (App Router) + TypeScript | Prisma ORM, NextAuth, PostgreSQL. Single language end-to-end. |
| Diagrams | Excalidraw | Visual canvas, stored as JSON. Deferred to Phase 2. |
| File storage | S3-compatible (MinIO locally) | Production-ready from day one; storage interface abstracts the backend. |
| Notifications | In-app feed + email (SMTP) | Pulled into the MVP so @mentions actually reach people. |

*Implementation note: Prisma was pinned to the stable v6 line. Prisma 7 now mandates driver adapters and removes the database URL from the schema, which added moving parts this MVP did not need.*

# 3. Architecture

A single Next.js application serves both the UI (React Server Components + client components) and the backend (server actions + route handlers). Core scoping insight preserved: overlapping features collapse into shared models.

- One Task model powers three views (board / list / SDLC status).
- One polymorphic Comment model attaches to tasks, documents, or storyboards.
- One polymorphic Attachment model, same pattern, backed by S3.
- Shared Markdown renderer for documents (and Phase 2 storyboard narrative).
- Single S3 storage interface — swapping MinIO <-> AWS S3 is an env change.

__Key directories:__

- src/auth.ts, src/auth.config.ts — NextAuth (edge-safe split for middleware/proxy).
- src/lib/ — prisma, s3, email, mentions, rbac, polymorphic, comments, attachments.
- src/app/(app)/ — board, tasks/[id], docs, notifications (auth-protected shell).
- prisma/schema.prisma, prisma/seed.ts — data model and seed data.

# 4. Local Infrastructure

Provisioned via docker-compose.yml. Postgres host port was remapped to 5434 to avoid conflicts with other services already running on the machine.

| Service | Purpose | Local endpoint |
|---|---|---|
| Postgres 16 | Application database | localhost:5434 |
| MinIO | S3-compatible file storage | API :9000 / console :9001 |
| MailHog | Captures outgoing email | SMTP :1025 / web :8025 |

# 5. Data Model

Entities and relationships (PostgreSQL via Prisma):

- User — email, name, passwordHash, role (ADMIN | MEMBER).
- Milestone — groups tasks, docs, storyboards; ordered.
- Task — title, description, status (BACKLOG→DESIGN→DEV→TESTING→DONE), assignee, milestone.
- Document — title, markdown content, author, optional milestone.
- Storyboard — narrative + Excalidraw JSON (modeled now, UI in Phase 2).
- Comment — polymorphic (task/document/storyboard), author, body.
- Attachment — polymorphic, fileName, s3Key, mimeType, size, uploader.
- Notification — per-user mention notifications, read flag, links to comment.

# 6. Features Delivered

| # | Feature | What was built |
|---|---|---|
| 1.1 | Schema, migrate, seed | Full Prisma schema; 4 seeded users, milestones, tasks, a welcome doc. |
| 1.2 | Accounts & auth | Credentials login (bcrypt), JWT sessions, Admin/Member RBAC, route protection. |
| 1.3 | Task Manager + Board | Kanban board, drag-and-drop across status columns, task detail page. |
| 1.4 | Comments + @mentions | Generic comment thread, @mention parsing and highlighting. |
| 1.5 | Documentation | Markdown wiki pages with live split-pane preview, milestone linking. |
| 1.6 | Attachments | Direct-to-S3 presigned upload and download via MinIO. |
| 1.7 | Notifications | In-app feed + unread badge + email delivery for mentions. |

# 7. Verification Results

__Static checks:__

- TypeScript (tsc --noEmit): clean.
- ESLint: clean.
- Production build (next build): success — all 10 routes compiled.

__Runtime checks against the live stack:__

| Check | Method | Result |
|---|---|---|
| Unauthed access | GET /board with no session | 307 redirect to /login — PASS |
| Login flow | CSRF + credentials POST | 302 to /board, session has ADMIN role — PASS |
| Authed board | GET /board with session | Renders seeded milestone + tasks — PASS |
| S3 round-trip | presigned PUT → GET → DELETE | Upload 200, body matches — PASS |
| Mention pipeline | comment with @alex | Notification row created — PASS |
| Email delivery | MailHog inbox check | 1 email delivered to alex — PASS |

# 8. How to Run

- docker compose up -d   (starts Postgres, MinIO, MailHog)
- npm install
- npx prisma migrate dev   (apply schema)
- npx prisma db seed   (create users + sample data)
- npm run dev   (app at http://localhost:3000)

__Seeded logins:__

- admin@arko.local / password123  (ADMIN)
- alex@arko.local  / password123  (MEMBER)

# 9. Known Gaps & Next Steps

- Phase 2 — Storyboarding UI (Excalidraw) not yet built; data model is ready.
- Phase 2 — extend comments/attachments UI to documents and storyboards.
- Later — document version history, finer-grained roles, full-text search.
- Ops — environment is local-only; no deploy/CI configured yet.
- Node 22 recommended before Jan 2027 (AWS SDK v3 minimum version warning).
