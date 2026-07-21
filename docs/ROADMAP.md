---
title: ARKO - Roadmap
tags:
  - arko
  - roadmap
created: 2026-07-01
updated: 2026-07-04
---

# ARKO Roadmap

## Foundation — Stack Migration ✅

- [x] Vite + React 19 frontend scaffold
- [x] Django 6 + DRF backend with JWT auth
- [x] Tailwind CSS v4 design system
- [x] PostgreSQL (Docker local → Neon production)
- [x] Monorepo structure (frontend/, backend/)
- [x] Docker Compose local dev (Postgres, MinIO, MailHog)

## Sprint 1 — Core Features ✅

- [x] Auth: Registration, login, JWT token refresh
- [x] Dashboard: Time-aware greeting, metric pills, live chart
- [x] Finance: Transactions, income/expense, categories, monthly calendar
- [x] Tasks: CRUD, Kanban board with drag-and-drop
- [x] Messages: Team conversations
- [x] Notes: Note-taking
- [x] Reminders: Reminder management
- [x] Settings: Profile editing, password change

## Sprint 2 — Deployment & Infra ✅

- [x] Vercel deployment (SPA + Python serverless)
- [x] Neon Postgres production database
- [x] Supabase Storage for file attachments
- [x] Environment variable management
- [x] Production Django settings (locked CORS, SSL)
- [x] CI/CD: git push → Vercel deploy

## Sprint 3 — Platform Enhancements ✅

- [x] File uploads (S3 storage → frontend FileUploader)
- [x] Task subtasks & dependencies (parent FK, TaskDependency model)
- [x] Task comments (generic Comment model, CommentSection UI)
- [x] In-app notifications (Notification model, bell UI, auto-generate signals)
- [x] User management (admin CRUD, role/status fields)

## Sprint 3.5 — Personal & Creative Tools ✅

- [x] Quote of the Day (dashboard widget, cached session API)
- [x] Personal Journal (private per-user entries with mood tracking)
- [x] R&D Ideas Board (brainstorm → task spawning)
- [x] Resource Library (links/docs/references with tags, search, type filter)

## Infrastructure — Backend Migration to Render ⏳ (Planned)

- [ ] Create `render.yaml` for Django + Daphne service definition
- [ ] Add `Dockerfile` / `Procfile` for Render deployment
- [ ] Remove `api/index.py` serverless wrapper (no longer needed)
- [ ] Update Vercel rewrites to proxy `/api/*` → Render URL
- [ ] Configure WebSocket routing for real-time messaging
- [ ] Set up Render Blueprint (infra-as-code from repo)
- [ ] Enable rolling deploys (zero-downtime cuts over)
- [ ] Provision background worker service if needed
- [ ] Deploy `feat/real-time-messaging` branch (blocked without this)

## Future

- [ ] Multi-workspace support
- [ ] Team billing
- [ ] Public API
- [ ] Mobile app
- [ ] Integrations (Slack, email)
