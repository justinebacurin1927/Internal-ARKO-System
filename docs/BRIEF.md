---
title: ARKO - Brief
tags:
  - arko
  - overview
created: 2026-07-01
---

# ARKO — Your Startup OS

**ARKO** is a full-stack startup operations system that connects money, tasks, and team in one place.

## What it does

- **Finance** — Track transactions, budgets, and categories
- **Tasks** — Kanban-style task management with priorities and subtasks
- **Workflows** — Automation with custom workflow definitions and executions
- **Messaging** — Team conversations and reminders
- **Notes** — Lightweight note-taking per workspace

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) + React 19 |
| Styling | Tailwind CSS v4 |
| API | tRPC v11 (end-to-end typesafe) |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth.js v5 (Credentials) |
| Monorepo | Turborepo + pnpm |

## Project Structure

```
arko/
├── apps/web/          # Next.js application
│   └── src/
│       ├── app/       # Pages (auth, dashboard, finance, tasks, workflows)
│       ├── lib/       # Auth, tRPC, rate-limit
│       └── server/    # tRPC routers
├── packages/
│   ├── db/            # Prisma schema + client
│   ├── ui/            # Shared components (Button, Card, Sidebar)
│   ├── finance/       # Finance engine
│   ├── workflows/     # Workflow state machine
│   ├── tasks/         # Task logic
│   └── dashboard/     # Dashboard widgets
└── scripts/           # Utility scripts
```

## Status

Active development. Sprint-based progression.
