# Story 5.9: User Management — Hardening & Completion (with Open Peeps Avatars)

**Epic:** Sprint 5 — Migration Gap Closure
**Status:** backlog
**Effort:** 3 days
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
- **Gravatar-only avatars**: avatars are Gravatar URLs only — no fallback for offline/no-gravatar, no customization.
- **No Open Peeps support**: The avatar system should use hand-drawn Open Peeps illustrations for user profiles, making them unique, recognizable, and customizable.

### Open Peeps Avatar System

An Open Peeps hand-drawn illustration set (`open-peeps-mono.sketch`) is available at
`/mnt/storage/tools/`. The `/apps/web` project has `@opeepsfun/open-peeps` installed,
which provides an `Effigy` React component that composes avatars from body, head, face,
beard, and accessory parts.

Every user gets a **deterministically-seeded** Open Peeps avatar on account creation
(replacing Gravatar as the default profile picture). Admins can view and reset avatars
from the user management page.

## Acceptance Criteria

### Backend
- [ ] Backend: `users.resetPassword({ userId })` (admin only) — regenerates + bcrypt-hashes a password, returns the plaintext once (reuse `generatePassword` + the `create` return pattern).
- [ ] Backend: `delete` handles related records gracefully — detect owned transactions (and other required relations) and either block with a clear `CONFLICT`/`BAD_REQUEST` message or reassign; document the decision. No raw FK 500s.
- [ ] Backend: keep the existing self-protection guards on `updateRole`/`updateStatus`/`delete` intact.
- [ ] Backend: **User creation uses deterministic Open Peeps avatar seed** instead of Gravatar URL — `generateAvatarSeed(userId)` picks body, head, face, beard, and accessory parts deterministically from user ID, stored as a JSON string in the `User.image` field (or new `User.avatar` field).
- [ ] Backend: **`users.updateAvatar`** — new admin procedure or extend `updateProfile` to accept avatar part overrides.

### Frontend
- [ ] Frontend: admin can trigger a password reset from the users page and see/copy the new password; safe-delete surfaces the friendly message instead of a generic error.
- [ ] Frontend: verify the create-time generated password is shown/copyable and role/status controls work end-to-end.
- [ ] Frontend: **Avatar component integrated in user list** — each user row shows their Open Peeps avatar (rendered via `OpenPeepsAvatar` component) alongside their name/email.
- [ ] Frontend: **Admin avatar preview** — clicking a user's avatar in the management panel shows the full avatar configuration (parts breakdown).
- [ ] Frontend: **Replace all Gravatar instances** across the app (nav bar, user list, task assignments, comments) with the `OpenPeepsAvatar` component.
- [ ] Frontend: **Admin can reset a user's avatar** to a new random seed.

### Tests
- [ ] Tests: `apps/web/src/server/api/routers/__tests__/users.test.ts` covering create (email uniqueness + generated password returned + avatar seed generated), self-role/self-status/self-delete guards, `resetPassword`, safe-delete behavior.
- [ ] Tests: avatar seed function produces stable output (same userId → same avatar config).

## Dev Notes

- **Ownership model:** all mutating procedures are ADMIN-only via `requireRole(['ADMIN'])` — not per-record ownership. `search` is the only non-admin procedure. Keep that split.
- **Password hashing:** `bcryptjs` `hash(plain, 12)` (already imported in the router). `resetPassword` must reuse it.
- **Self-protection:** guards compare `input.userId === ctx.user.id`; preserve them and add tests.
- **Safe delete:** check `prisma.transaction.count({ where: { userId } })` (required relation) before delete; `Task.assigneeId` is optional (nullable) so it's lower risk, but confirm the intended behavior.
- **Testing:** mirror the `createCaller` + mocked-prisma pattern in `tasks.test.ts` / `workflows.test.ts`. To exercise ADMIN-only procedures, set `userRole: 'ADMIN'` in the ctx.
- **Avatar storage**: `User.image` currently stores a Gravatar URL. Replace with a JSON string encoding Open Peeps parts: `'{"body":"BlazerBlackTee","head":"Afro","face":"Smile","beard":"None","accessory":"Glasses","skinColor":"#..."}'`. Or add a dedicated `User.avatar` JSON column — whichever is cleaner. The `OpenPeepsAvatar` component parses this JSON and renders the `Effigy`.
- **Seed function**: `apps/web/src/lib/avatar.ts` — `generateAvatarSeed(userId: string): AvatarConfig` — uses a simple hash of the userId to deterministically select parts from each category. This replaces `gravatarUrl()` in the `create` procedure.
- **Migration needed**: Add `avatar` JSON field to User model. Run `pnpm --filter @arko/db prisma migrate dev --name add_user_avatar`.
- **Design asset**: Full Open Peeps Sketch source at `/mnt/storage/tools/open-peeps-mono.sketch`.
- **npm package**: `@opeepsfun/open-peeps` ^1.0.6 (already installed in `apps/web`).

## References

- [Source: _bmad/planning/sprint-5-epic.md#Story 5.9]
- [Source: apps/web/src/server/api/routers/users.ts] — existing CRUD, guards, password/email helpers.
- [Source: apps/web/src/server/api/trpc.ts] — `requireRole` middleware.
- [Source: packages/db/prisma/schema.prisma] — `User`, `Transaction.userId` (required), `Task.assigneeId` (optional).
- [Source: _bmad/stories/5-5-settings-functional.md] — Open Peeps component plan (avatar builder/picker in settings).
- [Source: /mnt/storage/tools/open-peeps-mono.sketch] — Open Peeps illustration source file.
