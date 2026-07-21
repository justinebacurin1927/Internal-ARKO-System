# ARKO Migration — Remaining Steps (credential-gated)

Phases 0–4 are complete and committed on branch `feat/nextjs-migration`. The app builds
(`pnpm --filter @arko/web build` → 22 routes) and 18 unit tests pass. What's left needs
your accounts/secrets. Run these locally (use `! <cmd>` in the session to run interactively).

## 1. Provision a Neon Postgres database
- Create a database at https://neon.tech (or `vercel storage` → Neon integration).
- Copy the **pooled** connection string.

## 2. Fill local env
Edit `apps/web/.env` (gitignored) using `apps/web/.env.example` as the template:
```
DATABASE_URL="postgresql://…-pooler…/arko?sslmode=require"
AUTH_SECRET="$(openssl rand -base64 32)"
AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
AWS_REGION="…"; AWS_ACCESS_KEY_ID="…"; AWS_SECRET_ACCESS_KEY="…"; S3_BUCKET="…"
```
Prisma reads env from `packages/db/.env`, so also symlink or copy `DATABASE_URL` there:
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
vercel env add DATABASE_URL AUTH_SECRET AUTH_URL NEXT_PUBLIC_APP_URL AWS_REGION \
               AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY S3_BUCKET   # add each
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
