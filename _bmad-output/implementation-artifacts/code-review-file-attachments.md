# Code Review: File Attachments — Story 5.4

**Reviewer**: BMAD Code Review
**Date**: 2026-07-23
**Scope**: Backend validation, FileUploader, AttachmentList, wiring, tests

---

## Files Reviewed

| File | Lines | Status |
|------|-------|--------|
| `src/server/api/routers/storage.ts` | 140 | ✅ |
| `src/components/file-uploader.tsx` | 191 | ✅ |
| `src/components/attachment-list.tsx` | 159 | ✅ |
| `src/app/dashboard/tasks/page.tsx` | 668 | ✅ |
| `src/app/dashboard/resources/page.tsx` | 169 | ✅ |
| `src/server/api/routers/__tests__/storage.test.ts` | 257 | ✅ |

## Test Results

```
✓ 87/87 tests passing (12 test files)
  14 storage router tests (was 2, added 12)
```

---

## Findings

### 1. 🔴 Bug: Attachment list doesn't refresh after upload

**File**: `src/components/attachment-list.tsx:33-36`

`AttachmentList` manages its own `api.storage.listFor` query internally. When `FileUploader` completes an upload and calls `onUploadComplete`, the `TaskDetail` component's `setAttachRefresh` handler fires — but this state variable is never read, so the attachment list query is never invalidated.

```tsx
// TaskDetail state — unused
const [attachRefresh, setAttachRefresh] = useState(0)

// FileUploader callback — fires but does nothing visible
onUploadComplete={() => setAttachRefresh((n) => n + 1)}

// AttachmentList — no key binding, no refetch trigger
<AttachmentList resourceType={TASK_RESOURCE} resourceId={task.id} />
```

**Impact**: After uploading a file, the list stays empty until the user closes and reopens the drawer (which remounts `TaskDetail`). For resources, closing and reopening the collapsible won't remount (the key stays the same), so it never refreshes.

**Fix**: Pass `key` to AttachmentList so React remounts it on counter change:
```tsx
<AttachmentList key={attachRefresh} resourceType={TASK_RESOURCE} resourceId={task.id} />
```

### 2. ⚠️ Dead import: `File` icon in FileUploader

**File**: `src/components/file-uploader.tsx:4`

```tsx
import { Upload, X, Loader2, File, Check } from 'lucide-react'
```

`File` is imported but never used in the component.

### 3. ⚠️ Accessibility: No focus management after upload/error

**File**: `src/components/file-uploader.tsx`

After upload completes (success/error), the focus is lost. A keyboard user who triggers an upload has no clear focus target. The dismiss button on the error state isn't auto-focused, and the drop zone cycles back into the DOM without focus.

**Fix**: Add `autoFocus` to the error dismiss button, and `tabIndex={-1}` management for state transitions.

### 4. ℹ️ Observation: Only one file per drag/drop

**File**: `src/components/file-uploader.tsx:112`

```tsx
const handleDrop = (e: React.DragEvent) => {
  e.preventDefault()
  setDragOver(false)
  handleFile(e.dataTransfer.files[0])  // <-- only first file
}
```

The uploader handles one file at a time. This matches the single-file input (`<input type="file">` without `multiple`), but the drag zone silently drops additional files. At minimum, the drop text should say "Drop a file" not "files."

### 5. ℹ️ Observation: `getDownloadUrl` returns FORBIDDEN for missing file

**File**: `src/server/api/routers/storage.ts:67-69`

```typescript
const file = await ctx.prisma.fileAttachment.findUnique({ where: { id: input.id } })
if (!file || file.userId !== ctx.user.id!) throw new TRPCError({ code: 'FORBIDDEN' })
```

A non-existent file ID and a non-owned file both return `FORBIDDEN`. This leaks no information (good for security), but it means the test at line 159-168 asserts `FORBIDDEN` for a ghost file which matches the behavior — consistent.

### 6. ℹ️ Observation: Resource page uses `confirm()` native dialog for delete

**File**: `src/app/dashboard/resources/page.tsx:143`

```tsx
onClick={() => confirm('Delete this resource?') && del.mutate({ id: r.id })}
```

This was pre-existing (not part of this story), but contrasts with the Task drawer's inline confirm pattern. Consistent to update when resources get focus.

### 7. ℹ️ Test: Round-trip test mocks internal state

**File**: `src/server/api/routers/__tests__/storage.test.ts:204-256`

The lifecycle test uses an in-memory `fileRows` array to simulate the database. This correctly verifies the call sequences without needing a real DB. Good pattern.

---

## Summary

| Severity | Count | Action |
|----------|-------|--------|
| 🔴 Critical | 1 | Attachment list never refreshes after upload (#1) |
| 🟡 Major | 0 | — |
| ⚠️ Minor | 2 | Dead import (#2), focus management (#3) |
| ℹ️ Note | 4 | Single-file drop (#4), FORBIDDEN for ghosts (#5), native confirm (#6), test pattern (#7) |

**Overall**: Solid implementation with one critical bug (list doesn't show newly uploaded files) and two minor code issues. The test coverage is thorough with 14 storage tests including a full lifecycle round-trip.
