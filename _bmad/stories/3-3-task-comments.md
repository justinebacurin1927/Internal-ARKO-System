# Story 3.3: Task Comments

**Epic:** Sprint 3 — Enhancements
**Status:** backlog
**Effort:** 3 days

## Description

Add comment threads to tasks so team members can discuss work inline. Includes @mentions with basic notification trigger (integrated with Story 3.4).

## Acceptance Criteria

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
