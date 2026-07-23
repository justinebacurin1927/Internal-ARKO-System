# Story 5.5: Settings — Make It Functional

**Epic:** Sprint 5 — Migration Gap Closure
**Status:** backlog
**Effort:** 3 days
**Priority:** P1 — page is a static stub

## Description

`apps/web/src/app/dashboard/settings/page.tsx` renders only a static list of section
links — no forms are wired. `users.updateProfile` exists but is unused, and there is no
password-change procedure. Implement working profile editing, password change, and basic
preferences.

## Acceptance Criteria

- [ ] Frontend: Profile section form (name, email, avatar) wired to `users.updateProfile`
- [ ] Backend: `users.changePassword` procedure (verify current password, hash new) — new proc, does not exist
- [ ] Frontend: Password-change form wired to `users.changePassword` with validation
- [ ] Frontend: success/error toasts + inline validation on both forms
- [ ] Backend: authorization — a user can only edit their own profile/password (ADMIN may edit others via existing admin flows)
- [ ] Frontend: (optional) preferences section (theme/notifications) — scope or defer explicitly
- [ ] Tests: updateProfile + changePassword happy + auth-failure paths
