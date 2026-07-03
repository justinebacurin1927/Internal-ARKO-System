# ARKO — Internal Operations System

**Version:** v1.0.0 — [Phase 1 production release](https://github.com/justinebacurin1927/Internal-ARKO-System/releases/tag/v1.0.0)
**Status:** Live on Vercel · [Sprint 3](https://github.com/justinebacurin1927/Internal-ARKO-System/projects) in progress

**ARKO** is a full-stack internal operations platform that combines finance tracking, task management, messaging, notes, and reminders into one cohesive system for small teams.

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
│   │   ├── components/        # Reusable UI (Button, Card, Layout, etc.)
│   │   ├── lib/               # API client, auth context, toast
│   │   └── pages/             # Dashboard, Finance, Tasks, Notes, etc.
│   ├── api/                   # Vercel serverless: Django WSGI entry point
│   └── dist/                  # Build output (Vercel deploy)
├── backend/                    # Django API
│   ├── config/                 # Django settings (local + production)
│   ├── auth_app/               # User auth, JWT login/register
│   ├── tasks_app/              # Task CRUD + status management
│   ├── finance_app/            # Transactions, budgets, accounts
│   ├── messages_app/           # Team conversations
│   ├── notes_app/              # Note-taking
│   ├── reminders_app/          # Reminders
│   └── users_app/              # User profiles
├── apps/                       # Monorepo packages (Next.js org)
│   ├── web/                    # Next.js app (legacy / migration)
│   ├── dashboard/
│   └── ...
├── packages/                   # Shared packages (legacy)
├── api/                        # Vercel serverless function root
├── docker-compose.yml          # Local infra (Postgres, MinIO, MailHog)
└── vercel.json                 # Vercel deployment config
```

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

## Features

- **Dashboard** — Time-aware greeting, metric pills, real-time financial chart
- **Finance** — Transaction tracking, income/expense categories, budgets, monthly calendar view
- **Tasks** — Kanban board with drag-and-drop (To Do / In Progress / Review / Done), priorities, assignees
- **Messages** — Team conversations
- **Notes** — Lightweight note-taking
- **Reminders** — Reminder management with status tracking
- **Settings** — Profile editing, password change

## Auth

Django JWT authentication (Bearer tokens via SimpleJWT). Token refresh on expiry.

## License

MIT

---

**v1.0.0** — Phase 1 complete · [[ARKO - Architecture]] · [[ARKO - Brief]] · [[ARKO - Roadmap]]
