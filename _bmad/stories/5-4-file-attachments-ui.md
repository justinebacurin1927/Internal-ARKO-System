# Story 5.4: File Attachments — Surface the Uploader

**Epic:** Sprint 5 — Migration Gap Closure
**Status:** done
**Effort:** 3 days
**Priority:** P1 — backend complete, no UI

## Description

The `storage` router (`createUploadUrl`, `confirm`, `getDownloadUrl`, `listFor`,
`delete`), the S3 helper (`apps/web/src/lib/s3.ts`), and the `FileAttachment` model are
all in place, but there is no upload UI anywhere. Add a reusable uploader and wire it to
tasks and resources.

## Acceptance Criteria

- [ ] Frontend: reusable `FileUploader` (drag-and-drop + click) using the presigned-URL flow (`createUploadUrl` → PUT to S3 → `confirm`)
- [ ] Frontend: attachment list (image thumbnail / file icon + name + size) via `storage.listFor`
- [ ] Frontend: download via `getDownloadUrl`; delete via `storage.delete` (confirm)
- [ ] Frontend: upload progress indicator + error handling
- [ ] Frontend: wire uploader into task detail drawer and resource create/edit
- [ ] Backend: verify file size limit + allowed content types enforced in `createUploadUrl`/`confirm`
- [ ] Backend: verify Supabase Storage (prod) and MinIO (local) both work via `s3.ts`
- [ ] Tests: presign → confirm → list → delete round-trip
