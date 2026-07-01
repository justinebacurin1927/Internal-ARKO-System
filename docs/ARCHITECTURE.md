---
title: ARKO - Architecture
tags:
  - arko
  - architecture
created: 2026-07-01
---

# ARKO Architecture

## System Design

```mermaid
graph TD
    Client[Browser] --> Next[Next.js 15 App Router]
    Next --> TRPC[tRPC v11 Router]
    Next --> Auth[NextAuth v5]
    Next --> SS[Server Components]
    
    TRPC --> Finance[Finance Engine]
    TRPC --> Workflows[Workflow Engine]
    TRPC --> Tasks[Task Manager]
    TRPC --> DB[(PostgreSQL via Prisma)]
    
    Auth --> DB
    
    subgraph Packages
        Finance
        Workflows
        Tasks
        UI[UI Components]
    end
    
    UI --> Next
```

## Data Model

```mermaid
erDiagram
    User ||--o{ Account : has
    User ||--o{ Session : has
    User ||--o{ WorkspaceMember : belongs-to
    User ||--o{ Transaction : makes
    User ||--o{ Task : assigned
    User ||--o{ Workflow : creates
    
    Workspace ||--o{ WorkspaceMember : has
    
    AccountCategory ||--o{ Transaction : categorizes
    Budget ||--o{ AccountCategory : includes
    
    Workflow ||--o{ WorkflowExecution : executes
    WorkflowExecution ||--o{ ExecutionLog : logs
    
    Task ||--o{ Comment : has
    Task ||--o{ Task : subtasks
    
    Conversation ||--o{ Message : contains
    Conversation ||--o{ ConversationParticipant : includes
```

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Monorepo | Turborepo + pnpm | Shared packages, consistent tooling |
| API layer | tRPC v11 | End-to-end type safety, no codegen |
| Auth | NextAuth v5 Credentials | Simple password-based auth, JWT sessions |
| Database ORM | Prisma | Type-safe queries, migrations, studio |
| Styling | Tailwind CSS v4 | Utility-first, fast iteration |
| State | Server Components + React Query | Minimize client JS, cache on server |

## Deployment

- **Database**: PostgreSQL (local dev → Supabase)
- **Hosting**: Vercel (planned)
- **File storage**: S3-compatible (MinIO local → Supabase Storage planned)
