# Story 6.1: Security Hardening — Session Lifetime, Session Revocation & Durable Rate Limiting

**Epic:** Sprint 6 — Security Hardening
**Status:** in-progress — code changes done & building; AC #2 (durable Redis store) blocked on Upstash provisioning
**Effort:** 2–3 days
**Priority:** P1 — auth foundation is solid, but session lifetime, revocation, and rate-limit durability are real gaps for a multi-role internal system

## Description

The auth stack is well built: next-auth v5 Credentials + bcrypt(12), layered tRPC
authz (`protectedProcedure` / `requireRole` / owner-scoped), user-enumeration-safe
registration, and an `apiLimiter` already wired on the tRPC route. This story closes
the **runtime security gaps** found in a code audit — none of which are missing
features, all of which weaken the system against real attacks.

Gaps addressed:

- **No session timeout.** `lib/auth.ts` sets `session: { strategy: 'jwt' }` with **no `maxAge`**, so next-auth defaults to a **30-day** session with no idle/absolute limit. Too long for an internal business system.
- **Suspended users keep active sessions.** `status !== 'ACTIVE'` is checked **only at login** (`authorize`). The `jwt` callback reloads `role` on every request but **not `status`** — so suspending or restricting an already-logged-in user does **not** revoke their access until the JWT naturally expires (up to 30 days per the gap above).
- **Rate limiter is in-memory and per-instance.** `lib/rate-limit.ts` stores attempts in a process-local `Map` (its own comment admits this). On Vercel Fluid Compute there are N instances each with an independent counter that also **resets on cold start**, so "10 logins/min" is effectively "10 × instances/min until the next cold start" — materially weakening brute-force protection.
- **Login limiter keyed by email only.** `authLimiter.check(email)` throttles per-email, so **password spraying** (one common password across many accounts) never trips it. No per-IP dimension and no account lockout/backoff.

## Acceptance Criteria

### Session lifetime & revocation (`lib/auth.ts`)
- [x] Backend: set an explicit session policy — `session: { strategy: 'jwt', maxAge: 60 * 60 * 8, updateAge: 60 * 30 }` (8h absolute, refresh sliding every 30m). Value configurable; document the chosen numbers. **Done.**
- [x] Backend: `jwt` callback re-checks `status` on every refresh — if the DB user is missing or `status !== 'ACTIVE'`, return `null` so the session is invalidated (suspending a logged-in user logs them out on their next request). **Done** — `select` now includes `status`, returns `null` when not ACTIVE.
- [x] Backend: keep the existing "block non-ACTIVE at login" guard in `authorize` intact; the callback check is additive for **already-issued** sessions. **Done** — both guards present.
- [x] Backend: role continues to be reloaded from DB on refresh (existing behavior preserved). **Done.**

### Durable, shared rate limiting (`lib/rate-limit.ts`) — ⛔ BLOCKED on infra
- [ ] Backend: replace the in-memory `Map` store with a **shared store** (Upstash Redis via Vercel Marketplace preferred; fallback: a Postgres table) behind the **same `createRateLimiter` interface** so callers (`authLimiter`, `registerLimiter`, `apiLimiter`) are unchanged. **Blocked** — needs `vercel integration add upstash` first. Interface (`check`/`peek`/`clear`/`reset`) is already Redis-compatible, so this is a store swap only.
- [ ] Backend: rate-limit state survives cold starts and is consistent across instances; window semantics stay sliding-window. **Blocked** (same).
- [ ] Backend: graceful degradation — fail **closed** for auth endpoints if the store is unreachable. **Blocked** (same).
- [ ] Backend: provision `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` in Vercel env for all environments. **Blocked** — user action.

### Login brute-force resistance (`lib/auth.ts` + `lib/rate-limit.ts`)
- [x] Backend: add a **per-IP** login limit alongside the per-email limit so password spraying is throttled by source IP. **Done** — `authIpLimiter` (20/min per IP), IP from `authorize`'s `request` via `requestKey`.
- [x] Backend: add **account lockout** — after 5 failed attempts in 15 min the email is temporarily locked; generic message. **Done** — `loginLockout` (peek to gate, `check` on each failure, `clear` on success).
- [x] Backend: preserve generic failure responses (no "user not found" vs "bad password" distinction). **Done** — all paths return `null`.

### Tests
- [x] Tests: `lib/__tests__/rate-limit.test.ts` — window correctness, per-key isolation, `peek` (non-consuming), `clear`, and the full lockout flow. **Done — 5/5 passing.**
- [ ] Tests: auth callback — suspended user's existing session invalidated on next `jwt` refresh (mocked-prisma integration test). **Not yet** — follow-up (mirror `users.test.ts` mocked-prisma pattern).
- [x] Tests: login throttling thresholds (per-email, per-IP, lockout) trip as configured. **Covered** at the limiter level.

## Dev Notes

- **Session config:** all in `apps/web/src/lib/auth.ts` `NextAuth({ session, callbacks })`. `maxAge` is absolute expiry; `updateAge` is how often the JWT is re-issued (enables the sliding refresh + the per-request status check). Shorter `updateAge` = faster revocation but more DB hits.
- **Revocation:** the `jwt({ token, user })` callback already runs `prisma.user.findUnique({ where: { id }, select: { role } })` on every refresh — extend the `select` to include `status` and return a falsy token when not `ACTIVE`. This is the cheapest place to enforce revocation with JWT strategy (no DB session table needed).
- **Rate-limit swap:** keep the exported shape `{ check(key): { success, remaining, resetAt }, reset() }` in `apps/web/src/lib/rate-limit.ts`. Upstash's `@upstash/ratelimit` provides a sliding-window limiter that maps cleanly; wrap it to match. `requestKey(req)` already extracts IP from `x-forwarded-for`.
- **Callers to keep working unchanged:** `authLimiter` (login, in `authorize`), `registerLimiter` (`app/api/auth/register/route.ts`), `apiLimiter` (`app/api/trpc/[trpc]/route.ts`).
- **Fail-closed choice:** for `authLimiter`/`registerLimiter`, prefer fail-closed if Redis is down (deny with 429) to avoid an unthrottled brute-force window; `apiLimiter` can fail-open.
- **Per-IP + per-email:** either two sequential `check()` calls (`email` and `ip:<ip>`) or a compound key; two checks give clearer telemetry.
- **Env:** add Upstash creds via `vercel env add` (all environments). Marketplace: `vercel integration add upstash`.
- **Out of scope (follow-ups):** password policy strengthening (currently `min(6)`), auth/admin audit logging, nonce-based CSP (current CSP allows `unsafe-inline`/`unsafe-eval` for tRPC). Track as separate stories 6.2–6.4.

## References

- [Source: apps/web/src/lib/auth.ts] — session config, `authorize`, `jwt`/`session` callbacks, `authLimiter` usage.
- [Source: apps/web/src/lib/rate-limit.ts] — in-memory `createRateLimiter`, `authLimiter`/`registerLimiter`/`apiLimiter`, `requestKey`.
- [Source: apps/web/src/app/api/auth/register/route.ts] — `registerLimiter` per-IP usage, enumeration-safe errors.
- [Source: apps/web/src/app/api/trpc/[trpc]/route.ts] — `apiLimiter` per-IP on tRPC.
- [Source: apps/web/src/server/api/trpc.ts] — `enforceAuth` / `requireRole` middleware (session presence is the only gate; relies on token validity).
- [Source: apps/web/src/app/dashboard/layout.tsx] — server-side `auth()` redirect gate.
- [Source: packages/db/prisma/schema.prisma] — `User.status`, `User.role`.
