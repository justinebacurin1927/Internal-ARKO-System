---
title: ARKO - Scoping
tags:
  - arko
  - scoping
  - planning
created: 2026-06-28
---

__Internal Startup Platform__

Scoping & Feature Document

Prepared for: 4-person internal team

Status: Brainstorm / Pre-MVP

# 1. Overview & Goal

This document scopes an internal collaboration platform for a 4-person startup team, combining task management, lightweight documentation, storyboarding, and file storage into a single internal tool. The platform is not intended as a customer-facing product at this stage — the goal is to consolidate workflows currently split across tools like Slack, Trello, and Google Docs into one cohesive internal system.

__Core scope decisions made so far:__

- Communication is comments + @mentions only — no standalone chat app.
- Storyboarding covers narrative text and diagrams, not visual UI/UX mockups.
- This is for internal use only by the current 4-person team — not a sellable product (yet).
- Security is treated as a cross-cutting concern (auth + permissions), not a standalone feature module.

# 2. Feature Breakdown

Each requested feature is mapped to a concrete module, with a complexity estimate and build notes.

| Feature | Complexity | Notes |
|---|---|---|
| Accounts | Medium | Login + roles (Admin / Member). Foundation for every other module. |
| Security | N/A (cross-cutting) | Not a standalone module — permission checks layered across all features. |
| ToDo / Tasks | Low–Medium | Standard CRUD task list. Forms the base unit of the Task Manager. |
| Milestone Board | Low–Medium | Kanban-style grouping of tasks under epics/phases. |
| SDLC Task Manager | Medium | Same data as ToDo/Milestones, with a status field driving SDLC stages. |
| Documentation | Medium | Markdown wiki pages, linked to tasks/milestones. Versioning optional for v1. |
| Storyboarding | Medium–High | Narrative blocks (reuse doc editor) + embedded diagrams (Mermaid.js / Excalidraw). |
| Communication | Low (scoped down) | Comments + @mentions attached to any object — not a full chat system. |
| Storage | Medium | Lightweight file attachments tied to tasks/docs — no folder/drive system. |

# 3. Unified Module Strategy

Several requested features collapse into the same underlying system. Building them as one module avoids duplicated logic:

## 3.1 Task Manager (ToDo + Milestone Board + SDLC stages)

One Task model, three views:

- Milestone Board → epics/phases (e.g. "Sprint 1", "MVP Launch")
- ToDo → individual tasks under a milestone
- SDLC stages → a status field on the task (Backlog → Design → Dev → Testing → Done)

## 3.2 Comments & Mentions

A single generic Comment model attachable to any object — Task, Document, or Storyboard — via a polymorphic relation. @mentions parse for usernames and trigger a notification.

## 3.3 Documentation & Storyboarding

Storyboards reuse the same markdown/rich-text editor as Documentation for narrative sections, with diagrams embedded via Mermaid.js or Excalidraw rather than building a custom diagram tool from scratch.

## 3.4 Storage

File attachments are tied directly to a Task, Document, or Storyboard — no standalone folder/drive interface needed for v1.

# 4. Core Data Model (Conceptual)

A simplified entity relationship to guide schema design:

- User → has many → Comments, Tasks (assigned), Documents (authored)
- Milestone → has many → Tasks
- Task → belongs to → Milestone; has many → Comments, Attachments
- Document → has many → Comments, Attachments; belongs to → Milestone (optional)
- Storyboard → has many → Comments, Attachments; belongs to → Milestone (optional)
- Comment → belongs to → any of [Task, Document, Storyboard] (generic/polymorphic relation)
- Attachment → belongs to → any of [Task, Document, Storyboard] (generic/polymorphic relation)

# 5. MVP vs. Later Phases

## 5.1 MVP (Phase 1)

- Accounts: login + 2 roles (Admin / Member)
- Task Manager: tasks, milestones, status field, simple board view
- Comments + @mentions on tasks
- Documentation: markdown pages, basic linking to milestones
- File attachments on tasks/docs (no folder structure)

## 5.2 Phase 2

- Storyboarding module (narrative + embedded diagrams)
- Comments/mentions extended to Documents and Storyboards
- Notifications for mentions

## 5.3 Later / Optional

- Document version history
- Finer-grained roles/permissions (beyond Admin/Member)
- Public-facing product hardening, if this evolves beyond internal use

# 6. Open Questions for Next Pass

- Tech stack: confirm whether to proceed with Django/Python (existing familiarity) or evaluate alternatives.
- Diagram embedding: Mermaid.js (code-based, lightweight) vs. Excalidraw (visual, more interactive) — pick one for Storyboarding.
- Storage backend: local disk vs. S3-compatible storage for attachments.
- Notification delivery: in-app only, or also email, for @mentions?
