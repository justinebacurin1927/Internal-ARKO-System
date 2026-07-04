# ARKO Database Schema

> **Last updated:** 2026-07-05
> **Database:** PostgreSQL (Neon production, Docker local)
> **ORM:** Django 6.0 Models

## Overview

14 apps, 22 tables covering auth, tasks, notes, events, messaging, finance, journaling, ideas, resources, reminders, comments, file storage, and notifications.

---

## Table of Contents

- [App: auth\_app](#app-auth_app)
- [App: tasks\_app](#app-tasks_app)
- [App: notes\_app](#app-notes_app)
- [App: events\_app](#app-events_app)
- [App: reminders\_app](#app-reminders_app)
- [App: messages\_app](#app-messages_app)
- [App: notifications\_app](#app-notifications_app)
- [App: comments\_app](#app-comments_app)
- [App: journal\_app](#app-journal_app)
- [App: ideas\_app](#app-ideas_app)
- [App: resources\_app](#app-resources_app)
- [App: storage\_app](#app-storage_app)
- [App: finance\_app](#app-finance_app)
- [Entity Relationship Summary](#entity-relationship-summary)

---

## App: auth_app

### `users`

The central user table. Custom user model using `AbstractBaseUser` + `PermissionsMixin`. Authentication is email-based (`USERNAME_FIELD = 'email'`).

**Permission model:** Admin endpoints use a custom `IsRoleAdmin` permission class that checks `role = 'ADMIN'` — **not** Django's built-in `IsAdminUser` (which checks `is_staff`). The `is_staff` field is kept in sync with `role` as a secondary flag; `role` is the source of truth for authorization.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `BigAutoField` | PK | Auto-generated |
| `password` | `VARCHAR(128)` | NOT NULL | Django hashed |
| `email` | `EmailField` | UNIQUE, NOT NULL | Login identifier |
| `name` | `VARCHAR(255)` | NULLABLE | Display name |
| `image` | `VARCHAR(500)` | NULLABLE | Avatar URL/path |
| `phone` | `VARCHAR(50)` | NULLABLE | |
| `title` | `VARCHAR(255)` | NULLABLE | Job title |
| `role` | `VARCHAR(20)` | NOT NULL, default `'USER'` | See roles |
| `status` | `VARCHAR(20)` | NOT NULL, default `'ACTIVE'` | See statuses |
| `is_active` | `BOOLEAN` | NOT NULL, default `true` | |
| `is_staff` | `BOOLEAN` | NOT NULL, default `false` | Synced from `role` — not the primary gate |
| `is_superuser` | `BOOLEAN` | NOT NULL, default `false` | |
| `created_at` | `TIMESTAMP` | NOT NULL, auto | |
| `updated_at` | `TIMESTAMP` | NOT NULL, auto | |

**role choices:**
- `ADMIN` — System administrator
- `MEMBER` — Team member
- `USER` — Regular user

**status choices:**
- `ACTIVE` — Normal access
- `RESTRICTED` — Limited access
- `SUSPENDED` — No access

**Indexes:** PK on `id`, unique on `email`.

---

## App: tasks_app

### `tasks`

Kanban-style tasks with status workflow and parent/subtask hierarchy.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `BigAutoField` | PK | |
| `title` | `VARCHAR(255)` | NOT NULL | |
| `description` | `TEXT` | NULLABLE | |
| `status` | `VARCHAR(20)` | NOT NULL, default `'TODO'` | See statuses |
| `priority` | `VARCHAR(20)` | NOT NULL, default `'MEDIUM'` | See priorities |
| `assignee_id` | `BigInteger` | FK → `users.id`, NULLABLE | `ON DELETE SET NULL` |
| `parent_id` | `BigInteger` | FK → `tasks.id`, NULLABLE | Subtask parent, `ON DELETE CASCADE` |
| `due_date` | `TIMESTAMP` | NULLABLE | |
| `position` | `INTEGER` | NOT NULL, default `0` | Drag-drop ordering |
| `created_at` | `TIMESTAMP` | NOT NULL, auto | |
| `updated_at` | `TIMESTAMP` | NOT NULL, auto | |

**status choices:**
- `TODO` — Not started
- `IN_PROGRESS` — Active
- `REVIEW` — Awaiting review
- `DONE` — Completed

**priority choices:**
- `LOW`, `MEDIUM`, `HIGH`, `URGENT`

**Indexes:** `assignee_id`, `status`, `parent_id`.

### `task_dependencies`

Blocking relationships between tasks. Task A "depends on" Task B (B must be DONE before A can start).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `BigAutoField` | PK | |
| `task_id` | `BigInteger` | FK → `tasks.id`, NOT NULL | The dependent task |
| `depends_on_id` | `BigInteger` | FK → `tasks.id`, NOT NULL | The prerequisite task |
| `created_at` | `TIMESTAMP` | NOT NULL, auto | |

**Uniques:** `(task_id, depends_on_id)`

---

## App: notes_app

### `notes`

Simple rich-text notes owned by a user.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `BigAutoField` | PK | |
| `title` | `VARCHAR(255)` | NOT NULL | |
| `content` | `TEXT` | NULLABLE (blank allowed) | |
| `user_id` | `BigInteger` | FK → `users.id`, NOT NULL | Owner |
| `created_at` | `TIMESTAMP` | NOT NULL, auto | |
| `updated_at` | `TIMESTAMP` | NOT NULL, auto | |

**Indexes:** `user_id`, `updated_at`.

---

## App: events_app

### `events`

Calendar events with date, time range, and color coding.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `BigAutoField` | PK | |
| `title` | `VARCHAR(255)` | NOT NULL | |
| `description` | `TEXT` | NULLABLE | |
| `date` | `DATE` | NOT NULL | Primary date |
| `end_date` | `DATE` | NULLABLE | Multi-day events |
| `start_time` | `TIME` | NOT NULL | |
| `end_time` | `TIME` | NOT NULL | |
| `color` | `VARCHAR(7)` | NOT NULL, default `'#2D6A4F'` | Hex color |
| `user_id` | `BigInteger` | FK → `users.id`, NOT NULL | Owner |
| `created_at` | `TIMESTAMP` | NOT NULL, auto | |
| `updated_at` | `TIMESTAMP` | NOT NULL, auto | |

**Indexes:** `user_id`, `date`.

### `sprints`

Time-boxed sprint planning periods.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `BigAutoField` | PK | |
| `name` | `VARCHAR(255)` | NOT NULL | |
| `goal` | `TEXT` | NULLABLE | Sprint objective |
| `start_date` | `DATE` | NOT NULL | |
| `end_date` | `DATE` | NOT NULL | |
| `color` | `VARCHAR(7)` | NOT NULL, default `'#2D6A4F'` | |
| `is_active` | `BOOLEAN` | NOT NULL, default `true` | |
| `user_id` | `BigInteger` | FK → `users.id`, NOT NULL | Owner |
| `created_at` | `TIMESTAMP` | NOT NULL, auto | |
| `updated_at` | `TIMESTAMP` | NOT NULL, auto | |

**Indexes:** `user_id`, `(start_date, end_date)`.

---

## App: reminders_app

### `reminders`

Time-based reminders with completion tracking.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `BigAutoField` | PK | |
| `title` | `VARCHAR(255)` | NOT NULL | |
| `note` | `TEXT` | NULLABLE | Optional note |
| `due_at` | `TIMESTAMP` | NOT NULL | When to trigger |
| `is_done` | `BOOLEAN` | NOT NULL, default `false` | |
| `user_id` | `BigInteger` | FK → `users.id`, NOT NULL | Owner |
| `created_at` | `TIMESTAMP` | NOT NULL, auto | |

**Indexes:** `user_id`, `due_at`.

---

## App: messages_app

### `conversations`

Chat conversations (1-on-1 or group).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `BigAutoField` | PK | |
| `created_at` | `TIMESTAMP` | NOT NULL, auto | |
| `updated_at` | `TIMESTAMP` | NOT NULL, auto | |

**Indexes:** `updated_at`.

### `conversation_participants`

Many-to-many join between users and conversations, with read tracking.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `BigAutoField` | PK | |
| `conversation_id` | `BigInteger` | FK → `conversations.id`, NOT NULL | |
| `user_id` | `BigInteger` | FK → `users.id`, NOT NULL | |
| `last_read_at` | `TIMESTAMP` | NULLABLE | For unread count |

**Uniques:** `(conversation_id, user_id)`.
**Indexes:** `user_id`.

### `messages`

Individual messages within a conversation.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `BigAutoField` | PK | |
| `content` | `TEXT` | NOT NULL | |
| `conversation_id` | `BigInteger` | FK → `conversations.id`, NOT NULL | |
| `sender_id` | `BigInteger` | FK → `users.id`, NOT NULL | |
| `created_at` | `TIMESTAMP` | NOT NULL, auto | |
| `edited` | `BOOLEAN` | NOT NULL, default `false` | |

**Indexes:** `conversation_id`, `sender_id`, `created_at`.

---

## App: notifications_app

### `notifications`

System-generated notifications for task assignments, comments, mentions, etc.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `BigAutoField` | PK | |
| `user_id` | `BigInteger` | FK → `users.id`, NOT NULL | Recipient |
| `notif_type` | `VARCHAR(50)` | NOT NULL | See types |
| `title` | `VARCHAR(255)` | NOT NULL | |
| `message` | `TEXT` | NULLABLE | |
| `link` | `VARCHAR(500)` | NULLABLE | Frontend route |
| `read` | `BOOLEAN` | NOT NULL, default `false` | |
| `created_at` | `TIMESTAMP` | NOT NULL, auto | |

**notif_type choices:**
- `TASK_ASSIGNED` — A task was assigned
- `COMMENT` — New comment on your resource
- `MENTION` — You were mentioned
- `TASK_DONE` — A task you depend on was completed
- `MESSAGE` — New message (future use)

**Indexes:** `(user_id, read)`, `(user_id, -created_at)`.

---

## App: comments_app

### `comments`

Polymorphic comments attached to any resource (task, note, idea) via `resource_type` + `resource_id`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `BigAutoField` | PK | |
| `user_id` | `BigInteger` | FK → `users.id`, NOT NULL | Author |
| `resource_type` | `VARCHAR(50)` | NOT NULL | e.g. `TASK`, `NOTE`, `IDEA` |
| `resource_id` | `VARCHAR(255)` | NOT NULL | ID of the target resource |
| `content` | `TEXT` | NOT NULL | |
| `edited` | `BOOLEAN` | NOT NULL, default `false` | |
| `created_at` | `TIMESTAMP` | NOT NULL, auto | |
| `updated_at` | `TIMESTAMP` | NOT NULL, auto | |

**Indexes:** `(resource_type, resource_id)` (compound), `user_id`.

---

## App: journal_app

### `journal_entries`

Private per-user daily journal entries with mood tracking.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `BigAutoField` | PK | |
| `user_id` | `BigInteger` | FK → `users.id`, NOT NULL | Owner |
| `title` | `VARCHAR(255)` | NOT NULL | |
| `content` | `TEXT` | NULLABLE | |
| `mood` | `VARCHAR(20)` | NULLABLE | See moods |
| `date` | `DATE` | NOT NULL, auto = `date.today()` | |
| `created_at` | `TIMESTAMP` | NOT NULL, auto | |
| `updated_at` | `TIMESTAMP` | NOT NULL, auto | |

**mood choices:**
- `GREAT`, `GOOD`, `NEUTRAL`, `ROUGH`, `TOUGH`

**Indexes:** `(user_id, -date)` (compound, desc).
**Default ordering:** `[-date, -created_at]`.

---

## App: ideas_app

### `ideas`

Idea/feature tracking board with status lifecycle and optional task linkage.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `BigAutoField` | PK | |
| `user_id` | `BigInteger` | FK → `users.id`, NOT NULL | Owner |
| `title` | `VARCHAR(255)` | NOT NULL | |
| `description` | `TEXT` | NULLABLE | |
| `status` | `VARCHAR(20)` | NOT NULL, default `'IDEA'` | See statuses |
| `tags` | `JSONB` | default `[]` | Array of tag strings |
| `spawned_task_id` | `INTEGER` | NULLABLE | FK to `tasks.id` (soft) |
| `created_at` | `TIMESTAMP` | NOT NULL, auto | |
| `updated_at` | `TIMESTAMP` | NOT NULL, auto | |

**status choices:**
- `IDEA` — Brainstorming
- `PLANNING` — Being scoped
- `IN_PROGRESS` — Active development
- `COMPLETED` — Done
- `ARCHIVED` — No longer pursuing

**Indexes:** `(user_id, status)`, `(-created_at)`.

---

## App: resources_app

### `resources`

Curated links, files, documents, and references with tagging.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `BigAutoField` | PK | |
| `user_id` | `BigInteger` | FK → `users.id`, NOT NULL | Owner |
| `title` | `VARCHAR(255)` | NOT NULL | |
| `url` | `VARCHAR(1000)` | NULLABLE | External URL |
| `resource_type` | `VARCHAR(20)` | NOT NULL, default `'LINK'` | See types |
| `description` | `TEXT` | NULLABLE | |
| `tags` | `JSONB` | default `[]` | Array of tag strings |
| `file_id` | `UUID` | NULLABLE | FK to `file_attachments.id` (soft) |
| `created_at` | `TIMESTAMP` | NOT NULL, auto | |
| `updated_at` | `TIMESTAMP` | NOT NULL, auto | |

**resource_type choices:**
- `LINK` — Bookmark/URL
- `FILE` — Uploaded file
- `DOC` — Document
- `REF` — Reference material

**Indexes:** `(user_id, resource_type)`, `(-created_at)`.

---

## App: storage_app

### `file_attachments`

S3-backed file storage, polymorphically attached to resources.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | Auto-generated UUIDv4 |
| `user_id` | `BigInteger` | FK → `users.id`, NOT NULL | Uploader |
| `resource_type` | `VARCHAR(20)` | NOT NULL | See types |
| `resource_id` | `VARCHAR(255)` | NULLABLE | Target resource ID |
| `file_key` | `VARCHAR(500)` | NOT NULL | S3 object key |
| `file_name` | `VARCHAR(255)` | NOT NULL | Original filename |
| `file_size` | `INTEGER` | NOT NULL, default `0` | Bytes |
| `mime_type` | `VARCHAR(127)` | NOT NULL, default `'application/octet-stream'` | |
| `created_at` | `TIMESTAMP` | NOT NULL, auto | |

**resource_type choices:**
- `TASK`, `MESSAGE`, `NOTE`, `IDEA`, `LIBRARY`

**Indexes:** `user_id`, `(resource_type, resource_id)` (compound).

---

## App: finance_app

### `account_categories`

Finance account type classifications used to categorize transactions and budgets.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `BigAutoField` | PK | |
| `name` | `VARCHAR(255)` | NOT NULL | |
| `type` | `VARCHAR(20)` | NOT NULL | See types |
| `color` | `VARCHAR(20)` | NOT NULL, default `'#6b7280'` | |
| `icon` | `VARCHAR(100)` | NULLABLE | Icon identifier |

**type choices:**
- `CHECKING`, `SAVINGS`, `CREDIT_CARD`, `CASH`, `INVESTMENT`, `RECEIVABLE`, `PAYABLE`

### `business_metrics`

Key business metrics (revenue, costs, profit, etc.) — configurable per user.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `BigAutoField` | PK | |
| `user_id` | `BigInteger` | FK → `users.id`, NOT NULL | Owner |
| `key` | `VARCHAR(50)` | NOT NULL | Machine identifier |
| `name` | `VARCHAR(100)` | NOT NULL | Display name |
| `value` | `FLOAT` | NOT NULL, default `0` | Current value |
| `calculation` | `VARCHAR(20)` | NOT NULL, default `'manual'` | See calc types |
| `suffix` | `VARCHAR(10)` | NOT NULL, default `''` | e.g. `%`, `$` |
| `up_is_good` | `BOOLEAN` | NOT NULL, default `true` | |
| `decimals` | `INTEGER` | NOT NULL, default `0` | Display precision |
| `updated_at` | `TIMESTAMP` | NOT NULL, auto | |

**calculation choices:**
- `manual` — Manually entered
- `calculated` — Auto-calculated
- `derived` — Derived from other metrics

**Uniques:** `(user_id, key)`.

### `metric_history`

Time-series snapshots of business metric values.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `BigAutoField` | PK | |
| `metric_id` | `BigInteger` | FK → `business_metrics.id`, NOT NULL | |
| `value` | `FLOAT` | NOT NULL | Snapshot value |
| `recorded_at` | `TIMESTAMP` | NOT NULL, auto | |

**Default ordering:** `[-recorded_at]`.

### `budgets`

Monthly budget allocations per category.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `BigAutoField` | PK | |
| `user_id` | `BigInteger` | FK → `users.id`, NOT NULL | |
| `category_id` | `BigInteger` | FK → `account_categories.id`, NOT NULL | |
| `month` | `INTEGER` | NOT NULL | 1-12 |
| `year` | `INTEGER` | NOT NULL | |
| `amount` | `FLOAT` | NOT NULL | Budget limit |

**Uniques:** `(user_id, category_id, month, year)`.

### `recurring_transactions`

Repeating income/expense/transfer entries (subscriptions, salary, etc.).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `BigAutoField` | PK | |
| `user_id` | `BigInteger` | FK → `users.id`, NOT NULL | |
| `description` | `VARCHAR(255)` | NOT NULL | |
| `amount` | `FLOAT` | NOT NULL | |
| `type` | `VARCHAR(20)` | NOT NULL | See TX types |
| `frequency` | `VARCHAR(20)` | NOT NULL | See frequencies |
| `category_id` | `BigInteger` | FK → `account_categories.id`, NULLABLE | |
| `next_date` | `TIMESTAMP` | NOT NULL | Next occurrence |
| `is_active` | `BOOLEAN` | NOT NULL, default `true` | |
| `created_at` | `TIMESTAMP` | NOT NULL, auto | |

**type choices:** `INCOME`, `EXPENSE`, `TRANSFER`.
**frequency choices:** `WEEKLY`, `BIWEEKLY`, `MONTHLY`, `QUARTERLY`, `YEARLY`.
**Default ordering:** `[next_date]`.

### `transactions`

Individual income/expense/transfer records.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `BigAutoField` | PK | |
| `amount` | `FLOAT` | NOT NULL | |
| `description` | `TEXT` | NULLABLE | |
| `type` | `VARCHAR(20)` | NOT NULL | See TX types |
| `date` | `TIMESTAMP` | NOT NULL | |
| `category_id` | `BigInteger` | FK → `account_categories.id`, NOT NULL | |
| `user_id` | `BigInteger` | FK → `users.id`, NOT NULL | |

**type choices:** `INCOME`, `EXPENSE`, `TRANSFER`.
**Indexes:** `user_id`, `date`, `category_id`.

---

## Entity Relationship Summary

### Core entities (owned by user)

```
users
 ├── tasks (assignee)
 │    ├── task_dependencies (task → depends_on)
 │    └── comments (via polymorphic resource_type='TASK')
 ├── notes
 │    └── comments (via polymorphic resource_type='NOTE')
 ├── events
 ├── sprints
 ├── reminders
 ├── messages
 │    ├── conversations
 │    │    └── conversation_participants
 │    └── messages (in conversations)
 ├── notifications
 ├── journal_entries
 ├── ideas
 │    └── comments (via polymorphic resource_type='IDEA')
 ├── resources
 ├── file_attachments
 └── finance
      ├── business_metrics → metric_history
      ├── budgets → account_categories
      ├── recurring_transactions → account_categories
      └── transactions → account_categories
```

### Polymorphic comment system

`comments` uses string-based `resource_type` + `resource_id` instead of Django's ContentType framework. This avoids FK constraints while keeping queries simple. Supported types: `TASK`, `NOTE`, `IDEA`.

### Polymorphic file attachment system

`file_attachments` follows the same pattern. Supported types: `TASK`, `MESSAGE`, `NOTE`, `IDEA`, `LIBRARY`.

### Task hierarchy

`tasks.parent_id` creates a self-referential hierarchy. Enabled by `tasks_app 0002` migration (Sprint 3.5). A task's `subtasks` related_name gives access to children; `parent` gives access to the parent.
