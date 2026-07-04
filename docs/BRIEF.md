---
title: ARKO - Brief
tags:
  - arko
  - overview
created: 2026-07-01
updated: 2026-07-04
---

# ARKO — Internal Operations System

**ARKO** is a full-stack internal operations platform that connects money, tasks, messages, notes, ideas, and resources in one place for small teams.

## What it does

- **Finance** — Track transactions, budgets, account categories, income vs expenses, recurring transactions, business metrics
- **Tasks** — Kanban-style board with drag-and-drop, priorities, assignees, search, subtasks, dependencies, comments
- **Messages** — Team conversations with participants, message editing/deletion
- **Notes** — Lightweight note-taking
- **Reminders** — Reminder management with status tracking
- **Dashboard** — Time-aware greeting, metric pills, live financial chart, quote of the day
- **Journal** — Private per-user journal entries with mood tracking
- **R&D Ideas** — Brainstorm board with status tracking, tags, one-click task spawning
- **Resource Library** — Links, docs, and references with tags, search, type filtering
- **File Uploads** — Attach files to tasks and other resources via S3 storage (Supabase)
- **User Management** — Admin CRUD with roles (Admin/Member/User) and status (Active/Restricted/Suspended)
- **Notifications** — In-app notifications for task assignments, comments, and mentions
- **Calendar** — Events and sprints

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React 19 + TypeScript + Tailwind CSS v4 |
| Backend | Django 6 + Django REST Framework + JWT (SimpleJWT) |
| Database | Neon Postgres (production) / Docker PostgreSQL (local) |
| File Storage | Supabase Storage (S3-compatible, production) / MinIO (local) |
| Hosting | Vercel (SPA + Python serverless functions) |
| API Client | Native fetch with auto token refresh |

## Project Structure

```
arko/
├── frontend/              # Vite React SPA
│   ├── src/
│   │   ├── components/    # Button, Card, Layout, ConfirmDialog, FileUploader,
│   │   │                  # CommentSection, NotificationBell, SwipeableTabs, ui/
│   │   ├── lib/           # api.ts, auth.tsx, toast.tsx
│   │   └── pages/         # Dashboard, Finance, Tasks, Messages, Journal,
│   │                      # Ideas, Resources, Notes, Reminders, etc.
│   └── api/               # Vercel serverless WSGI entry point
├── backend/                # Django API
│   ├── config/            # settings.py, production.py, urls.py
│   ├── auth_app/          # Registration, login, token refresh, admin user mgmt
│   ├── tasks_app/         # Task CRUD, subtasks, dependencies, Kanban
│   ├── finance_app/       # Transactions, budgets, categories, metrics
│   ├── messages_app/      # Conversations, messages
│   ├── notes_app/         # Notes
│   ├── reminders_app/     # Reminders
│   ├── events_app/        # Calendar events and sprints
│   ├── users_app/         # User profiles and search
│   ├── storage_app/       # File uploads/downloads (S3/Supabase)
│   ├── comments_app/      # Generic comments for any resource
│   ├── notifications_app/ # In-app notifications with auto-signals
│   ├── journal_app/       # Private per-user journal entries
│   ├── ideas_app/         # R&D ideas board with task spawning
│   └── resources_app/     # Resource library (links, docs, references)
├── api/                   # Vercel serverless function root
└── vercel.json            # Vercel deployment config
```

## Status

**v2.0.0 — Sprints 1–3.5 complete, live in production.** Deployed on Vercel with Neon Postgres.

- https://arko-internal-system.vercel.app

---

**v2.0.0** — Sprints 1–3.5 · [[ARKO - Architecture]] · [[ARKO - Phase 1 Report]] · [[ARKO - Roadmap]]
