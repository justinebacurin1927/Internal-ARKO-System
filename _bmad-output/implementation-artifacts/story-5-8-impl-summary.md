# Story 5.8 Implementation Summary

**Story:** Journal & Resources — Editing
**Status:** done
**Date:** 2026-07-31

## What was built

### 1. Journal Edit Affordance
- **`page.tsx`** — Added `editId` state, `Pencil` icon button on each journal entry card
  - Clicking the pencil pre-populates the create form with the entry's title, mood, and content
  - Form header reads "Edit Entry" vs "New Entry" based on mode
  - Submit calls `journal.update` when editing, `journal.create` when creating
  - Cancel button appears in edit mode to revert
  - New button resets edit state when toggling

### 2. Resources Edit Affordance
- **`page.tsx`** — Added `editId` state, `Pencil` icon button on each resource card
  - Clicking the pencil pre-populates the create form with title, URL, and description
  - Same create/edit mode switching as journal (header text, API call, cancel button)
  - Pencil sits before the attachments and delete buttons

### 3. Tests
- **Already covered:** The router-level tests for `journal.update` and `resources.update` already exist in the test suite (ownership guards + happy path).

## Files changed
- `apps/web/src/app/dashboard/journal/page.tsx` — Added edit mode, update mutation, pencil button, pre-populated form
- `apps/web/src/app/dashboard/resources/page.tsx` — Added edit mode, update mutation, pencil button, pre-populated form

## Test impact
- All 190 tests pass (19 suites) — no changes needed, router tests already exist
