# Arko — Your Startup OS

**Workflows · Finance · Task Management**

A full-stack startup operations system built with Next.js, TypeScript, and tRPC.

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router) + React 19 |
| **Styling** | Tailwind CSS v4 + shadcn/ui primitives |
| **API** | tRPC v11 (type-safe, end-to-end) |
| **Database** | PostgreSQL + Prisma ORM |
| **Auth** | NextAuth.js v5 (Credentials) |
| **Monorepo** | Turborepo + pnpm workspaces |
| **Language** | TypeScript (strict) |

## 📦 Project Structure

```
arko/
├── apps/
│   └── web/              # Next.js application
│       ├── src/
│       │   ├── app/      # App Router pages
│       │   │   ├── auth/        # Login/Register
│       │   │   ├── dashboard/   # Main dashboard
│       │   │   ├── finance/     # Finance module
│       │   │   ├── tasks/       # Task management
│       │   │   ├── workflows/   # Workflow automation
│       │   │   └── settings/    # Account settings
│       │   ├── lib/
│       │   │   ├── auth.ts           # NextAuth config
│       │   │   └── trpc/             # tRPC client/server
│       │   └── server/api/
│       │       ├── trpc.ts           # tRPC init
│       │       ├── root.ts           # App router
│       │       └── routers/          # Route handlers
│       │           ├── finance.ts
│       │           ├── tasks.ts
│       │           └── workflows.ts
│       └── .env
├── packages/
│   ├── config/           # Shared TypeScript config
│   ├── db/               # Prisma schema + client
│   │   └── prisma/
│   │       └── schema.prisma
│   ├── ui/               # Shared component library
│   │   └── src/          # Button, Card, Sidebar, etc.
│   ├── finance/          # Finance engine
│   ├── workflows/        # Workflow state machine
│   ├── tasks/            # Task management logic
│   └── dashboard/        # Dashboard widgets
```

## 🗄️ Database Schema

- **User & Auth** — Users, accounts, sessions (NextAuth compatible)
- **Workspace** — Multi-workspace support with members
- **Finance** — Transactions, categories, budgets (bounded context)
- **Workflows** — Workflow definitions, executions, execution logs
- **Tasks** — Tasks, subtasks, comments, Kanban status flow

## 🔧 Getting Started

```bash
# Prerequisites: Node.js 20+, PostgreSQL

# Start PostgreSQL
sudo systemctl start postgresql

# Create database
createdb arko

# Install dependencies
pnpm install

# Push schema to database
pnpm db:push

# Start development
pnpm dev
```

## 📋 Sprint Plan

| Sprint | Focus | Stories |
|---|---|---|
| **Sprint 1** | Foundation + Finance MVP | Monorepo, Auth, DB, Finance engine, Dashboard |
| **Sprint 2** | Workflow Automation | Workflow engine, definitions, execution |
| **Sprint 3** | Task Management | Kanban board, assignments, comments |
| **Sprint 4** | Dashboard + Reports | Widgets, charts, export, integrations |

## 📄 License

MIT
