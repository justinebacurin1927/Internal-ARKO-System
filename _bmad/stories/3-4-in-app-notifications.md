# Story 3.4: In-App Notifications

**Epic:** Sprint 3 — Enhancements
**Status:** backlog
**Effort:** 5 days

## Description

Build an in-app notification system so users are alerted about @mentions, task assignments, and comment replies. No email delivery for v1.

## Acceptance Criteria

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
