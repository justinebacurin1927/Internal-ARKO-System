---
title: ARKO - Phase 1 Report
tags:
  - arko
  - phase1
  - completed
created: 2026-06-28
updated: 2026-07-04
---

# Phase 1 Build & Deploy Report

*Prepared for: 4-person internal team*
*Date: 4 July 2026 | Status: Sprints 1–3.5 complete, deployed to production*

## 1. Overview

Phase 1 delivered the full ARKO platform across Sprints 1 through 3.5: a React SPA frontend, Django REST API backend, Neon PostgreSQL database, deployed to Vercel production with Supabase Storage for file attachments. The platform now spans 11 backend apps and 14 frontend pages covering operations, creativity, and knowledge management.

## 2. Architecture Evolution

The project was originally started as a Next.js 15 monorepo with tRPC, Prisma, and NextAuth. During Phase 1 it was migrated to:

| Original | Migrated To | Reason |
|---|---|---|
| Next.js 15 App Router | Vite + React 19 | Simpler SPA, no SSR needed for internal tool |
| tRPC v11 | Django REST Framework | Python team familiarity, built-in admin |
| Prisma ORM | Django ORM | Native migrations, less abstraction |
| NextAuth v5 | Django JWT (SimpleJWT) | Tightly integrated with Django auth |
| Turborepo + pnpm | Plain npm + Python venv | Simplify toolchain |

## 3. Features Delivered

### Sprint 1 — Core Features

| Module | Features |
|---|---|
| **Auth** | Registration, login, JWT access + refresh tokens, auto-refresh on 401 |
| **Dashboard** | Time-of-day greeting, metric pills (tasks/notes/reminders), animated financial chart |
| **Finance** | Transactions (income/expense), account categories, budgets, monthly calendar view |
| **Tasks** | Full Kanban board, drag-and-drop between 4 columns, priorities, assignees, search, delete |
| **Messages** | Team conversations, participant management |
| **Notes** | Create and manage notes |
| **Reminders** | Reminder CRUD with status tracking |
| **Settings** | Profile editing, password change |

### Sprint 2 — Deployment & Infra

| Feature | Details |
|---|---|
| **Vercel Deploy** | SPA + Python serverless functions, zero-downtime deploys |
| **Neon Postgres** | Production database, ap-southeast-2 region |
| **Supabase Storage** | S3-compatible file storage configured |
| **CI/CD** | `vercel deploy --prod` pushes go live immediately |

### Sprint 3 — Platform Enhancements

| Feature | Details |
|---|---|
| **File Uploads** | S3 upload/download/delete via `storage_app`, `FileUploader` component with previews |
| **Task Subtasks** | Parent FK on Task model, expandable subtask tree in Kanban cards |
| **Task Dependencies** | `TaskDependency` model, dependency indicators on cards |
| **Task Comments** | Generic `Comment` model (type + ID), `CommentSection` component (full + compact) |
| **In-app Notifications** | `Notification` model with auto-signals, bell icon with unread count dropdown |
| **User Management** | Admin CRUD, role (Admin/Member/User) and status (Active/Suspended) controls |

### Sprint 3.5 — Personal & Creative Tools

| Feature | Details |
|---|---|
| **Quote of the Day** | Dashboard widget, session-cached API quote with local fallbacks |
| **Personal Journal** | Private entries with mood tracking (5 moods), CRUD, sort by date |
| **R&D Ideas Board** | Grid view with status filter, tags, one-click task spawning |
| **Resource Library** | Links/docs/references with type filter, tags, search |

## 4. Infrastructure

### Local Development

| Service | Purpose | Endpoint |
|---|---|---|
| Postgres 16 | Application database | `localhost:5434` |
| MinIO | S3-compatible file storage | API `:9000` / Console `:9001` |
| MailHog | Email capture | SMTP `:1025` / Web `:8025` |

### Production

| Service | Platform | Region |
|---|---|---|
| Frontend + API | Vercel | Global (iad1) |
| Database | Neon Postgres | ap-southeast-2 |
| File Storage | Supabase Storage | ap-southeast-1 |
| Repo | GitHub | justinebacurin1927/Internal-ARKO-System |

### URLs

- **Production**: https://arko-internal-system.vercel.app
- **API health**: https://arko-internal-system.vercel.app/api/health/

## 5. Verification Results

| Check | Result |
|---|---|
| Frontend (200) | ✅ |
| API health endpoint | ✅ `{"status": "ok"}` |
| User registration | ✅ JWT tokens returned |
| User login | ✅ JWT tokens returned |
| SPA routing (all 14 pages) | ✅ 200 |
| Django migrations (28+ applied) | ✅ |
| TypeScript build | ✅ Clean |
| Vercel build + deploy | ✅ Zero downtime |

## 6. How to Run (Local)

```bash
docker compose up -d

cd backend && source .venv/bin/activate && pip install -r requirements.txt
python manage.py migrate && python manage.py runserver

cd frontend && npm install && npm run dev
```

## 7. How to Deploy

```bash
vercel deploy --prod --scope justinebacurin1927s-projects
```

Vercel env vars are managed via `vercel env add`.

## 8. Known Gaps & Next Steps

- No search across modules (separate search for each page)
- No email delivery for notifications (in-app only)
- No webhook or integration system (Slack, email)
- No multi-workspace support
- Mobile responsive but not a native app
