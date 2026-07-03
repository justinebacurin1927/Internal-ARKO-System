---
title: ARKO - Brief
tags:
  - arko
  - overview
created: 2026-07-01
updated: 2026-07-04
---

# ARKO — Internal Operations System

**ARKO** is a full-stack internal operations platform that connects money, tasks, messages, notes, and reminders in one place for small teams.

## What it does

- **Finance** — Track transactions, budgets, account categories, income vs expenses
- **Tasks** — Kanban-style board with drag-and-drop, priorities, assignees, search
- **Messages** — Team conversations with participants
- **Notes** — Lightweight note-taking
- **Reminders** — Reminder management with status tracking
- **Dashboard** — Time-aware greeting, metric pills, live financial chart

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
│   │   ├── components/    # Button, Card, Layout, ConfirmDialog, ui/
│   │   ├── lib/           # api.ts, auth.tsx, toast.tsx
│   │   └── pages/         # Dashboard, Finance, Tasks, Messages, etc.
│   └── api/               # Vercel serverless WSGI entry point
├── backend/                # Django API
│   ├── config/            # settings.py, production.py, urls.py
│   ├── auth_app/          # Registration, login, token refresh
│   ├── tasks_app/         # Task CRUD, status management
│   ├── finance_app/       # Transactions, budgets, categories
│   ├── messages_app/      # Conversations, messages
│   ├── notes_app/         # Notes
│   ├── reminders_app/     # Reminders
│   └── users_app/         # User profiles and search
├── api/                   # Vercel serverless function root
└── vercel.json            # Vercel deployment config
```

## Status

**v1.0.0 — Live in production.** Deployed on Vercel with Neon Postgres. [Sprint 3](https://github.com/justinebacurin1927/Internal-ARKO-System/projects) in progress.

- https://arko-internal-system.vercel.app

---

**v1.0.0** — Phase 1 complete · [[ARKO - Architecture]] · [[ARKO - Phase 1 Report]] · [[ARKO - Roadmap]]
