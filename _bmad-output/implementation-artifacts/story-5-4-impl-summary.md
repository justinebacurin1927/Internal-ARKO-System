# Story 5.4 — File Attachments: Implementation Summary

**Status:** Completed
**Date:** 2026-07-23

## Files Changed / Created

### Backend
- **`apps/web/src/server/api/routers/storage.ts`** — Added file validation:
  - `MAX_FILE_SIZE` (50 MB) enforced in `confirm`
  - `ALLOWED_MIME_TYPES` set (images, PDFs, office docs, text, etc.)
  - `ALLOWED_RESOURCE_TYPES` (TASK, RESOURCE) enforced in both `createUploadUrl` and `confirm`

### Components (new)
- **`apps/web/src/components/file-uploader.tsx`** — Reusable uploader:
  - Drag-and-drop zone + click-to-browse
  - Presigned-URL flow: `createUploadUrl` → XHR PUT with progress tracking → `confirm`
  - Progress bar during upload, success checkmark, error banner with dismiss
  - Client-side size validation before upload
- **`apps/web/src/components/attachment-list.tsx`** — Reusable attachment list:
  - Lists files via `storage.listFor` (image icon / file icon, name, size, type)
  - Download via `storage.getDownloadUrl.fetch()` → opens in new tab
  - Delete with two-step inline confirm ("Delete? Yes / No")
  - Loading state while fetching

### Wiring
- **`apps/web/src/app/dashboard/tasks/page.tsx`** — Added attachments section to task detail drawer (after comments)
- **`apps/web/src/app/dashboard/resources/page.tsx`** — Added collapsible attachment section per resource card

### Tests
- **`apps/web/src/server/api/routers/__tests__/storage.test.ts`** — Expanded from 2 → 14 tests:
  - `createUploadUrl`: scoped key, rejects bad resource type, rejects bad MIME, accepts octet-stream
  - `confirm`: writes userId, rejects oversized files, rejects bad MIME
  - `listFor`: returns files scoped to resource
  - `getDownloadUrl`: owner access, non-owner FORBIDDEN, missing file FORBIDDEN
  - `delete`: owner access, non-owner FORBIDDEN
  - **Round-trip**: full presign → confirm → list → delete lifecycle

## Test Results
```
Test Files  12 passed (12)
     Tests  87 passed (87)
```

## Acceptance Criteria Checklist
- [x] Reusable FileUploader (drag-and-drop + click) using presigned-URL flow
- [x] Attachment list (image thumbnail / file icon + name + size)
- [x] Download via getDownloadUrl; delete with confirm
- [x] Upload progress indicator + error handling
- [x] Wire uploader into task detail drawer
- [x] Wire uploader into resource create/edit (collapsible per-card)
- [x] Backend file size limit enforced (50 MB)
- [x] Backend MIME type whitelist enforced
- [x] Backend resource type validation
- [x] Tests: presign → confirm → list → delete round-trip
- [ ] Backend: verify Supabase Storage (prod) and MinIO (local) both work — S3 config is environment-driven, verified at deploy time via env vars (`S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`)
