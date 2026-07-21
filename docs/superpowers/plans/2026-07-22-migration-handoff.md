# ARKO Migration — Status & Remaining Steps

Branch `feat/nextjs-migration`. **DB migration is DONE and verified against the real Supabase
database** (project `ommsjbvcevgzzowlavdm`, region ap-southeast-1). Only the Vercel deploy and
the Django/Vite cleanup remain.

## ✅ DONE (verified 2026-07-22)
- Prisma migration applied to Supabase in a **dedicated `arko` schema** (Django's 40 `public`
  tables untouched). Migration `20260721220905_init` is committed.
- Seeded: admin `admin@arko.app` / `admin123` + 7 finance categories.
- Real-DB router verification: CRUD green across 11 domains via actual tRPC callers.
- Connection: IPv4 **pooler** `aws-1-ap-southeast-1.pooler.supabase.com` (the direct
  `db.<ref>.supabase.co` host is IPv6-only and unreachable from this network).
- Local `apps/web/.env` + `packages/db/.env` already point at Supabase (gitignored; hold the
  DB password — rotate in Supabase if you want it out of local files).

## 1. (done) Database — Supabase, dedicated `arko` schema
Prisma lives in its own `arko` schema in the same Supabase DB Django uses. Connection URLs carry
`schema=arko` (+ `pgbouncer=true` on the :6543 transaction pooler). See `apps/web/.env.example`.

## 2. Fill local env
Edit `apps/web/.env` (gitignored) using `apps/web/.env.example` as the template:
```
DATABASE_URL="…your existing Django Postgres URL…"
AUTH_SECRET="$(openssl rand -base64 32)"
AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
# S3-compatible storage (Django uses Supabase Storage):
S3_ENDPOINT="https://<proj>.supabase.co/storage/v1/s3"; S3_REGION="…"
S3_ACCESS_KEY_ID="…"; S3_SECRET_ACCESS_KEY="…"; S3_BUCKET="arko-attachments"
```
Prisma reads env from `packages/db/.env`, so also copy `DATABASE_URL` there:
```
echo 'DATABASE_URL="…same as above…"' > packages/db/.env
```

## 3. Create + apply the initial migration (commits migration files)
```
pnpm db:migrate --name init      # creates packages/db/prisma/migrations/* and applies to Neon
git add packages/db/prisma/migrations && git commit -m "feat(db): initial migration"
```

## 4. Seed
```
pnpm --filter @arko/db exec tsx prisma/seed.ts         # finance categories
pnpm --filter @arko/db exec tsx prisma/seed-admin.ts   # admin@arko.app / admin123 (ADMIN)
```

## 5. Run locally and smoke-test all 15 domains
```
pnpm dev    # http://localhost:3000 → log in as admin@arko.app / admin123
```
Check create/read/update/delete in: finance, tasks, notes, reminders, messages, workflows,
users, comments, events, ideas, journal, notifications, resources, storage (S3 upload), auth.

## 6. Deploy to Vercel
```
vercel link            # set project root dir = apps/web
vercel env add DATABASE_URL DIRECT_URL AUTH_SECRET AUTH_URL NEXT_PUBLIC_APP_URL S3_ENDPOINT \
               S3_REGION S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY S3_BUCKET   # add each
# DATABASE_URL/DIRECT_URL are the Supabase pooler URLs WITH schema=arko (see apps/web/.env).
# Set AUTH_URL/NEXT_PUBLIC_APP_URL to the real Vercel domain, not localhost.
vercel                 # preview deploy → verify login + one CRUD flow
```
The Vercel build runs `pnpm --filter @arko/db db:deploy` (applies committed migrations) then
`next build`. `@arko/db` postinstall runs `prisma generate`.

## 7. Cleanup (only after step 5/6 pass) — I can do this on your go
```
git rm -r backend frontend render.yaml Procfile render-build.sh render-env-template.txt
# review api/ and docker-compose.yml; remove if Django-only
```
Then I'll update `README.md` + `AGENTS.md` for the Next.js/Vercel setup and open the PR.

## Notes / deviations from the plan
- Skipped the speculative Task `dependsOn` self-M2M (no UI consumer; not in the original
  tRPC app). Task hierarchy (`parent`/`subtasks`) is retained.
- Deferred header notification bell + inline comments panel (polish). The Notifications page
  and Comments router already provide full CRUD for those domains.
- The installed Next.js is standard **15.5.21** — there is no `node_modules/next/dist/docs/`,
  so the AGENTS.md "not the Next.js you know" note does not apply; standard App Router used.
