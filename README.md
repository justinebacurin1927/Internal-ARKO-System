# ARKO — Internal Operations System

**Version:** v2.0.0 — Sprints 1–3.5 complete
**Status:** Live on Vercel · [Sprint 3.5](https://github.com/justinebacurin1927/Internal-ARKO-System/projects) complete

**ARKO** is a full-stack internal operations platform that combines finance tracking, task management, messaging, notes, journal, ideas, resources, and notifications into one cohesive system for small teams.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vite + React 19 + TypeScript + Tailwind CSS v4 |
| **Backend** | Django 6 + Django REST Framework + JWT (SimpleJWT) |
| **Database** | Neon Postgres (production) / Docker PostgreSQL (local) |
| **File Storage** | Supabase Storage (production) / MinIO (local) |
| **Hosting** | Vercel (frontend SPA + Django serverless functions) |
| **Email** | SMTP (MailHog for local dev) |

## Project Structure

```
arko/
├── frontend/                  # Vite React SPA
│   ├── src/
│   │   ├── components/        # Reusable: Button, Card, FileUploader,
│   │   │                      #   CommentSection, NotificationBell, etc.
│   │   ├── lib/               # API client, auth context, toast
│   │   └── pages/             # 14 pages: Dashboard, Finance, Tasks,
│   │                          #   Messages, Journal, Ideas, Resources, etc.
│   └── api/                   # Vercel serverless: Django WSGI entry point
├── backend/                    # Django API (11 apps)
│   ├── config/                 # Django settings (local + production)
│   ├── auth_app/               # User auth, JWT, admin user management
│   ├── tasks_app/              # Task CRUD, subtasks, dependencies
│   ├── finance_app/            # Transactions, budgets, accounts, metrics
│   ├── messages_app/           # Team conversations
│   ├── notes_app/              # Note-taking
│   ├── reminders_app/          # Reminders
│   ├── events_app/             # Calendar events and sprints
│   ├── users_app/              # User profiles
│   ├── storage_app/            # File uploads (S3 / Supabase)
│   ├── comments_app/           # Comments for any resource
│   ├── notifications_app/      # In-app notifications + signals
│   ├── journal_app/            # Private per-user journal
│   ├── ideas_app/              # R&D ideas board with task spawning
│   └── resources_app/          # Resource library (links/docs)
├── api/                        # Vercel serverless function root
├── docker-compose.yml          # Local infra (Postgres, MinIO, MailHog)
└── vercel.json                 # Vercel deployment config
```

## Features

| Module | Features |
|---|---|
| **Dashboard** | Time-aware greeting, metric pills, real-time financial chart, quote of the day |
| **Finance** | Transaction tracking, income/expense categories, budgets, recurring transactions, monthly calendar view, business metrics |
| **Tasks** | Kanban board with drag-and-drop (To Do / In Progress / Review / Done), priorities, assignees, subtasks, dependencies, comments, search |
| **Messages** | Team conversations with participants, message editing/deletion |
| **Notes** | Lightweight note-taking |
| **Reminders** | Reminder management with status tracking |
| **Calendar** | Events and sprints |
| **Journal** | Private per-user journal with mood tracking |
| **Ideas** | R&D ideas board with status, tags, one-click task spawning |
| **Resources** | Resource library for links, docs, and references with tags and search |
| **File Uploads** | Attach files to tasks and resources via S3 (Supabase) |
| **Notifications** | In-app notifications for task assignments and comments |
| **Settings** | Profile editing, password change |
| **User Management** | Admin CRUD with roles and status controls |

## Getting Started (Local Dev)

```bash
# Prerequisites: Docker, Node.js 20+, Python 3.12+

# 1. Start local infrastructure
docker compose up -d

# 2. Set up Python backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# 3. Set up frontend (separate terminal)
cd frontend
npm install
npm run dev
```

The frontend runs on **http://localhost:5173** and proxies `/api/*` to Django at **http://localhost:8000**.

## Deployment

| Service | Platform | URL |
|---|---|---|
| Frontend + API | Vercel | https://arko-internal-system.vercel.app |
| Database | Neon Postgres | ap-southeast-2 region |
| File Storage | Supabase Storage | Project: Internal-ARKO-System |

### Deploy

```bash
vercel deploy --prod --scope justinebacurin1927s-projects
```

Environment variables are managed via Vercel CLI (`vercel env add`).

## Auth

Django JWT authentication (Bearer tokens via SimpleJWT). Token refresh on expiry with idle session timeout (30 min auto-logout).

## Docs

- [[ARKO - Architecture]](docs/ARCHITECTURE.md)
- [[ARKO - Brief]](docs/BRIEF.md)
- [[ARKO - Roadmap]](docs/ROADMAP.md)
- [[ARKO - Phase 1 Report]](docs/PHASE1-REPORT.md)

---

**v2.0.0** — Sprints 1–3.5 complete
