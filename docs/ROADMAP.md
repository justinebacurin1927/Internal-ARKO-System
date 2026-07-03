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

## Sprint 3 — Enhancements 🔜

- [ ] Task subtasks and dependencies
- [ ] Task comments
- [ ] File uploads (Supabase Storage integration)
- [ ] Notification system
- [ ] Search across all modules
- [ ] Workflow automation engine
- [ ] Charts and reports export

## Future

- [ ] Multi-workspace support
- [ ] Team billing
- [ ] Public API
- [ ] Mobile app
- [ ] Integrations (Slack, email)
