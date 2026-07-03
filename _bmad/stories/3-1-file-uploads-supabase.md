# Story 3.1: File Uploads — Supabase Storage Integration

**Epic:** Sprint 3 — Enhancements
**Status:** backlog
**Effort:** 3 days

## Description

Wire the existing Supabase Storage bucket (and MinIO locally) to the frontend so users can attach files to tasks, notes, and messages.

## Acceptance Criteria

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
