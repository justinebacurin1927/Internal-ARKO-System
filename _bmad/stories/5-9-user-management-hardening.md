# Story 5.9: User Management — Hardening & Completion

**Epic:** Sprint 5 — Migration Gap Closure
**Status:** backlog
**Effort:** 2 days
**Priority:** P2 — backend CRUD exists; close robustness + coverage gaps

## Description

Unlike the other Epic 5 items, user management is **not** a missing backend. The `users`
router (`apps/web/src/server/api/routers/users.ts`) already provides admin-gated `list`,
`create` (auto email/password/gravatar), `updateProfile`, `updateRole`, `updateStatus`, and
`delete`, all behind `requireRole(['ADMIN'])`, with self-protection guards (can't remove your
own admin role, restrict/suspend/delete yourself). The users page is wired to these.

What's missing is robustness and coverage:

- **No tests** for a router with real logic (password generation, `findAvailableEmail` uniqueness loop, self-role/self-delete guards).
- **No password reset** for an existing user — `create` returns a generated password once, but an admin cannot regenerate it later.
- **Unsafe delete**: `Transaction.userId` is a required relation with no cascade, so deleting a user who has transactions throws a raw FK error (500 / ugly failure).

## Acceptance Criteria

- [ ] Backend: `users.resetPassword({ userId })` (admin only) — regenerates + bcrypt-hashes a password, returns the plaintext once (reuse `generatePassword` + the `create` return pattern).
- [ ] Backend: `delete` handles related records gracefully — detect owned transactions (and other required relations) and either block with a clear `CONFLICT`/`BAD_REQUEST` message or reassign; document the decision. No raw FK 500s.
- [ ] Backend: keep the existing self-protection guards on `updateRole`/`updateStatus`/`delete` intact.
- [ ] Frontend: admin can trigger a password reset from the users page and see/copy the new password; safe-delete surfaces the friendly message instead of a generic error.
- [ ] Frontend: verify the create-time generated password is shown/copyable and role/status controls work end-to-end.
- [ ] Tests: `apps/web/src/server/api/routers/__tests__/users.test.ts` covering create (email uniqueness + generated password returned), self-role/self-status/self-delete guards, `resetPassword`, and safe-delete behavior.

## Dev Notes

- **Ownership model:** all mutating procedures are ADMIN-only via `requireRole(['ADMIN'])` — not per-record ownership. `search` is the only non-admin procedure. Keep that split.
- **Password hashing:** `bcryptjs` `hash(plain, 12)` (already imported in the router). `resetPassword` must reuse it.
- **Self-protection:** guards compare `input.userId === ctx.user.id`; preserve them and add tests.
- **Safe delete:** check `prisma.transaction.count({ where: { userId } })` (required relation) before delete; `Task.assigneeId` is optional (nullable) so it's lower risk, but confirm the intended behavior.
- **Testing:** mirror the `createCaller` + mocked-prisma pattern in `tasks.test.ts` / `workflows.test.ts`. To exercise ADMIN-only procedures, set `userRole: 'ADMIN'` in the ctx.
- No migration expected.

## References

- [Source: _bmad/planning/sprint-5-epic.md#Story 5.9]
- [Source: apps/web/src/server/api/routers/users.ts] — existing CRUD, guards, password/email helpers.
- [Source: apps/web/src/server/api/trpc.ts] — `requireRole` middleware.
- [Source: packages/db/prisma/schema.prisma] — `User`, `Transaction.userId` (required), `Task.assigneeId` (optional).
