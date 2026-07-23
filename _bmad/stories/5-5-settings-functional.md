# Story 5.5: Settings — Make It Functional

**Epic:** Sprint 5 — Migration Gap Closure
**Status:** backlog
**Effort:** 4 days
**Priority:** P1 — page is a static stub

## Description

`apps/web/src/app/dashboard/settings/page.tsx` renders only a static list of section
links — no forms are wired. `users.updateProfile` exists but is unused, and there is no
password-change procedure. Implement working profile editing, password change, basic
preferences, and **Open Peeps avatar customization**.

An Open Peeps hand-drawn illustration kit (`open-peeps-mono.sketch`) is available at
`/mnt/storage/tools/`. The `@opeepsfun/open-peaks` npm package provides an `Effigy`
React component for composing avatars from body, head, face, beard, and accessory parts.

Every user gets a deterministically-seeded Open Peeps avatar on account creation
(replacing the current Gravatar URL fallback). Settings profile section includes an
avatar builder/picker where users can customize their Open Peeps character.

## Backend Changes

- **`users.updateProfile`** — extend input to accept avatar part selections
  (`avatarParts: { body, head, face, beard?, accessory?, skinColor?, hairColor? }`)
  stored as a JSON field on the User model or as a generated URL string.
- **`users.changePassword`** — new procedure: verify current password, hash and set new.
  Standard authorization (owner only; ADMIN may edit others if desired, though this is
  primarily self-service).
- **`User` model migration** — add optional `avatar` JSON field to store Open Peeps
  part configuration, or encode it in the `image` URL string. Document the choice.

## Frontend Changes

### Profile Section
- Edit name, email display (non-editable), phone, title
- **Open Peeps avatar builder** — interactive picker showing the `Effigy` component
  with dropdowns/panels for:
  - **Body**: effigy (bust), sitting, or standing pose types
  - **Head/hairstyle**: 48 options (Afro, Bald, Bangs, Bantu Knots, Bun, Cornrows, etc.)
  - **Face**: 30 expressions (Smile, Calm, Cheeky, Cute, Serious, etc.)
  - **Beard** (optional): 18 options (Chin, Full, Goatee, Moustache variants, None)
  - **Accessories** (optional): Eyepatch, Glasses (5 variants), Sunglasses (2 variants)
  - **Skin color / hair color** pickers
- Each change immediately updates the preview `Effigy` component
- "Save profile" persists the avatar configuration

### Password Change Section
- Current password + new password + confirm form
- Validation: min length, match confirm
- Success/error toasts

### Preferences Section (optional — scope or defer)
- Theme toggle (light/dark)
- Notification preferences

## Component Architecture

- **`apps/web/src/components/open-peeps-avatar.tsx`** — lightweight wrapper around
  `@opeepsfun/open-peeps` `Effigy` that accepts a seed/configuration string and
  renders the composed avatar. Used everywhere a user avatar is displayed.
- **`apps/web/src/components/open-peeps-picker.tsx`** — avatar builder panel with
  part-selector controls and live preview. Used in the settings profile section.

## Seed / Deterministic Generation

On account creation, generate an avatar configuration deterministically from the
user ID (replacing `gravatarUrl()`). The seed picks one part from each category,
creating a unique, recognizable avatar (no two users get the same combination by
default). The avatar config is saved to the User record so changes persist.

## Acceptance Criteria

- [ ] Backend: `User.avatar` JSON field added to Prisma schema (+ migration)
- [ ] Backend: `users.updateProfile` extended to accept and store `avatar` parts
- [ ] Backend: `users.changePassword` procedure — verify current password, hash new
- [ ] Backend: user creation uses deterministic Open Peeps seed instead of Gravatar
- [ ] Frontend: `OpenPeepsAvatar` component renders `Effigy` from stored config
- [ ] Frontend: Profile form (name, phone, title) wired to `users.updateProfile`
- [ ] Frontend: **Avatar builder/picker** with live preview in profile section
- [ ] Frontend: Password-change form with validation wired to `users.changePassword`
- [ ] Frontend: success/error toasts + inline validation on all forms
- [ ] Frontend: replace Gravatar with `OpenPeepsAvatar` in nav bar, user list, everywhere
- [ ] Tests: `updateProfile` + `changePassword` happy + auth-failure paths
- [ ] Tests: `OpenPeepsAvatar` component renders with various configs without crashing

## Dev Notes

- **Config storage**: Add `avatar: Json` optional field to the User model. Store
  `{ body: "...", head: "...", face: "...", beard: "...", accessory: "...",
  skinColor: "#...", hairColor: "#..." }`. No separate table needed.
- **Seed function**: `generateAvatarSeed(userId: string): AvatarConfig` in
  `apps/web/src/lib/avatar.ts` — uses a simple hash of `userId` to pick parts
  deterministically. Imported in `users.create` procedure.
- **Design asset**: Full Open Peeps illustration set at
  `/mnt/storage/tools/open-peeps-mono.sketch` (Sketch source file).
  The `@opeepsfun/open-peeps` npm package provides the actual rendering.
- **Effigy API**: `<Effigy body={{ type, options }} head={{ type, options }}
  face={{ type, options }} beard={{ type, options }} accessory={{ type, options }}
  style={{ width, height }} />` — all `PieceDetails` with type strings matching
  the part file names and options for color customization.
- **Migration**: `pnpm --filter @arko/db prisma migrate dev --name add_user_avatar`
