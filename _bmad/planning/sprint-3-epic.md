---
title: Sprint 3 — Enhancements
epic: 3
status: in-progress
created: 2026-07-04
---

# Epic 3: Sprint 3 — Platform Enhancements

**Status:** In Progress
**Target:** 4 features — file uploads, task subtasks/dependencies, task comments, in-app notifications

## Overview

Phase 1 delivered the core ARKO platform (auth, dashboard, finance, tasks, messages, notes, reminders, settings). Sprint 3 closes key UX gaps: file attachments, task hierarchy, team discussion on tasks, and awareness via notifications.

---

## Story 3.1: File Uploads — Supabase Storage Integration

**Status:** backlog
**Effort:** 3 days
**Dependencies:** Supabase Storage already provisioned in production

### Description

Wire the existing Supabase Storage bucket (and MinIO locally) to the frontend so users can attach files to tasks, notes, and messages.

### Acceptance Criteria

- [ ] Backend: Django storage backend configured for MinIO (dev) and Supabase Storage (production)
- [ ] Backend: `FileUpload` model with generic foreign key (Task, Note, Message, Conversation)
- [ ] API: Upload endpoint (`POST /api/upload/`) — accepts multipart file, returns URL
- [ ] API: Delete endpoint (`DELETE /api/upload/:id/`)
- [ ] API: List files endpoint (`GET /api/upload/?object_type=task&object_id=5`)
- [ ] Frontend: File picker component (drag-and-drop zone + click-to-browse)
- [ ] Frontend: File attachment list UI (thumbnail for images, icon + name for others)
- [ ] Frontend: Upload progress indicator
- [ ] Frontend: Wire to Task create/edit, Note create/edit, Message compose
- [ ] Files served with correct Content-Type and Content-Disposition
- [ ] File size limit enforced (configurable, default 10MB)
- [ ] Allowed file types: images, PDFs, .docx, .xlsx, .txt, .csv
- [ ] Integration tests: upload, download, delete, unauthorized access

---

## Story 3.2: Task Subtasks & Dependencies

**Status:** backlog
**Effort:** 4 days

### Description

Extend the Task model with parent-child relationships (subtasks) and task-to-task dependencies (blocked-by). Update the Kanban board to show subtask progress and dependency chains.

### Acceptance Criteria

- [ ] Backend: `parent` FK on Task model (self-referential, nullable)
- [ ] Backend: `depends_on` M2M on Task model (self-referential, symmetrical=False)
- [ ] Backend: Validation — no circular dependencies (A → B → A)
- [ ] Backend: Validation — a task cannot be its own parent or depend on itself
- [ ] Backend: API returns `subtasks: []` and `depends_on: [{id, title, status}]` in task detail
- [ ] Backend: When parent task is marked done, all subtasks must also be done (or warn)
- [ ] Backend: When a task is blocked by an incomplete dependency, its column auto-locks
- [ ] API: PATCH endpoint supports `parent` and `depends_on` updates
- [ ] Frontend: Subtask list in task detail drawer (checkbox, title, assignee mini-avatar)
- [ ] Frontend: Create subtask inline from task drawer
- [ ] Frontend: Dependency picker — search and select tasks (modal or typeahead)
- [ ] Frontend: Dependency indicator on Kanban card — "Blocked by: #42"
- [ ] Frontend: Subtask progress bar on parent card (e.g., "3/5 done")
- [ ] Frontend: Blocked tasks show visual indicator and cannot be dragged to Done
- [ ] E2E: Create parent → add subtask → complete subtask → verify parent shows progress

---

## Story 3.3: Task Comments

**Status:** backlog
**Effort:** 3 days

### Description

Add comment threads to tasks so team members can discuss work inline. Includes @mentions with basic notification trigger (integrated with Story 3.4).

### Acceptance Criteria

- [ ] Backend: `Comment` model with FK to Task, User (author), content, created_at, updated_at
- [ ] Backend: API — `GET /api/tasks/:id/comments/`, `POST /api/tasks/:id/comments/`, `DELETE /api/comments/:id/`
- [ ] Backend: Comments returned in chronological order
- [ ] Backend: Comment author auto-set from JWT user
- [ ] Backend: @mention detection — parse `@username` in comment body, return mentioned user IDs
- [ ] Backend: Comment edit endpoint (owner only, 15-min window)
- [ ] Frontend: Comment thread component at bottom of task detail drawer
- [ ] Frontend: Inline reply with textarea + submit
- [ ] Frontend: Author avatar + name + relative timestamp
- [ ] Frontend: @mention typeahead — `@` triggers user search dropdown
- [ ] Frontend: Edit button on own comments (within window)
- [ ] Frontend: Delete confirmation dialog
- [ ] Frontend: Comment count badge on Kanban card
- [ ] API: Pagination for comments (20 per page)

---

## Story 3.4: In-App Notifications

**Status:** backlog
**Effort:** 5 days
**Dependencies:** Story 3.3 (comments + @mentions trigger the notification events)

### Description

Build an in-app notification system so users are alerted about @mentions, task assignments, and comment replies. No email delivery for v1.

### Acceptance Criteria

- [ ] Backend: `Notification` model — recipient (User), type (mention/assignment/comment), actor (User), target object (generic FK), read_at (nullable), created_at
- [ ] Backend: Signal-based creation — post_save on Comment triggers mention notifications, post_save on Task triggers assignment notification
- [ ] Backend: API — `GET /api/notifications/` (paginated, newest first)
- [ ] Backend: API — `PATCH /api/notifications/:id/read/` (mark single as read)
- [ ] Backend: API — `PATCH /api/notifications/read-all/` (mark all as read)
- [ ] Backend: API — `GET /api/notifications/unread-count/` (returns count for badge)
- [ ] Backend: Deduplication — don't create duplicate notifications for the same event
- [ ] Frontend: Bell icon in top nav with unread count badge
- [ ] Frontend: Notification dropdown (last 20, scrollable, "Show all" link)
- [ ] Frontend: Each notification shows icon by type, message text, relative time
- [ ] Frontend: Click notification → mark as read + navigate to target (task, comment)
- [ ] Frontend: "Mark all as read" action in dropdown footer
- [ ] Frontend: Real-time-ish polling (every 30s) or WebSocket for count update
- [ ] Mobile-responsive: bell icon works on small screens
