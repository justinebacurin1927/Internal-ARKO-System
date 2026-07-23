# Code Review: Open Peeps Avatar System (Story 5.5)

**Reviewer**: BMAD Code Review
**Date**: 2026-07-23
**Scope**: Avatar library, components, backend router, tests

---

## Files Reviewed

| File | Lines | Status |
|------|-------|--------|
| `src/lib/avatar.ts` | 204 | ✅ |
| `src/components/open-peeps-avatar.tsx` | 107 | ✅ |
| `src/components/open-peeps-picker.tsx` | 243 | ✅ |
| `src/server/api/routers/users.ts` | 422 | ✅ |
| `src/lib/__tests__/avatar.test.ts` | 141 | ✅ |
| `src/server/api/routers/__tests__/users.test.ts` | 159 | ✅ |

## Test Results

```
✓ 75/75 tests passing (12 test files)
  13 new avatar/lib tests
  10 new users router tests
```

---

## Findings

### 1. ⚠️ Bug: `Math.abs()` edge case in `hashUserId` (minor)

**File**: `src/lib/avatar.ts:114`

```typescript
function hashUserId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}
```

`Math.abs(-2147483648)` returns `-2147483648` in JavaScript (the minimum int32 can't be negated). If a userId hashes to exactly `-2147483648`, `seed` stays negative, and `pick()` would compute an array access at a negative index → `undefined`.

**Impact**: Near-zero probability (~1 in 4 billion hashes), but deterministic — if a user happens to get that ID, their avatar seed silently produces `undefined` parts and the fallback renders `?`.

**Fix**: `return Math.abs(h) >>> 0` or guard with `return h === -2147483648 ? 0 : Math.abs(h)`.

### 2. ⚠️ Fragile: `avatarJson` prop type accepts only strings

**File**: `src/components/open-peeps-avatar.tsx:10`

```typescript
avatarJson?: string | null
```

The prop is typed as `string | null` and parsed with `JSON.parse`. But Prisma JSON fields return **parsed objects** when read — if someone passes `user.avatar` directly (the object from Prisma), `JSON.parse(object)` throws silently and falls through to the seed.

The current usage in `comment-thread.tsx` correctly stringifies:
```tsx
avatarJson={c.user?.avatar ? JSON.stringify(c.user.avatar) : undefined}
```

But the contract isn't enforced at the type level.

**Fix**: Accept `avatarJson?: string | object | null` and handle both:
```typescript
if (typeof avatarJson === 'string') cfg = JSON.parse(avatarJson)
else if (avatarJson) cfg = avatarJson as AvatarConfigJson
```

### 3. ⚠️ Accessibility: No alt text on avatar image

**File**: `src/components/open-peeps-avatar.tsx:96-104`

The Effigy component renders an inline SVG with no `aria-label` or `role="img"`. Screen readers see a generic `<span>` wrapping an SVG with no semantic meaning.

**Fix**:
```tsx
<span className={className} style={{ display: 'inline-flex', lineHeight: 0 }}
      role="img" aria-label={`Avatar for ${userName ?? 'user'}`}>
```

(Requires passing `userName` prop or making it a prop.)

### 4. ℹ️ Observation: No debouncing in avatar picker

**File**: `src/components/open-peeps-picker.tsx:167-178`

Every dropdown/color change immediately fires `onChange` via `useEffect`. On the settings page this means every single tweak triggers a tRPC `updateProfile` call. There's no debouncing — a user cycling through haircut options fires N mutations.

**Mitigation**: Debounce in the parent (settings page) rather than the picker, since the picker is pure presentation. The current settings page does handle this partially (save on button click only), but the picker's immediate `onChange` could accidentally rewire.

### 5. ℹ️ Observation: Crypto adequacy of `generatePassword`

**File**: `src/server/api/routers/users.ts:18-45`

Uses `Math.random()` for auto-generated passwords. `Math.random()` is not cryptographically secure. For initial setup passwords that are shown once and should be changed, this is acceptable — but worth documenting with a comment.

### 6. ℹ️ Test: Probability tests could theoretically flake

**File**: `src/lib/__tests__/avatar.test.ts:43-58`

The beard (~67%) and accessory (~75%) probability tests use 100 seeds each and assert at least one positive and negative case. With 100 iterations:
- P(no beard in 100 trials) = (1 - 0.67)^100 ≈ 10^−48 — effectively zero
- P(no accessory in 100 trials) = (1 - 0.75)^100 ≈ 10^−60 — effectively zero

Risk-free in practice but worth noting as a pattern to avoid with smaller sample sizes.

---

## Summary

| Severity | Count | Action |
|----------|-------|--------|
| 🔴 Critical | 0 | — |
| 🟡 Major | 0 | — |
| ⚠️ Minor | 3 | Fix `Math.abs` edge case (#1), handle object `avatarJson` (#2), add aria-label (#3) |
| ℹ️ Note | 3 | Debouncing pattern (#4), Math.random (#5), test flake theory (#6) |

**Overall**: Clean, well-structured implementation. The test coverage is thorough with 23 new tests hitting all key paths. The three issues found are low-severity edge cases — none would block release.
