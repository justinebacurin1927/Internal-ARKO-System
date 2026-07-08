---
title: ARKO - Deployment & Infrastructure Decision
tags:
  - arko
  - infrastructure
  - deployment
created: 2026-07-08
updated: 2026-07-08
---

# ARKO — Deployment & Infrastructure Strategy

## Current Architecture (July 2026)

```
Vercel (arko-internal-system.vercel.app)
├── / (root)          → Vite React SPA (frontend/dist/)
├── /api/*            → Django WSGI serverless function (api/index.py)
│
Backing Services:
├── Neon Postgres     → Database (ap-southeast-2)
└── Supabase Storage  → File storage (S3-compatible API)
```

### How it works

1. Vercel rewrites `/{path}` → `index.html` (SPA handles all client routes)
2. Vercel rewrites `/api/{path}` → `api/index.py` serverless function
3. `api/index.py` loads Django WSGI app with production settings
4. Django routes the request through URL dispatcher

### API entry point (on cold start)

`api/index.py` does the following on every cold start:
- Inserts `backend/` into `sys.path`
- Sets `DJANGO_SETTINGS_MODULE` to `config.production` on Vercel
- Calls `django.setup()` (loads all 15+ apps, builds ORM)
- Runs pending database migrations (with auto-fake for existing tables)
- Returns a WSGI app via `get_wsgi_application()`

## Pain Points — Vercel as Django Host

| Issue | Severity | Detail |
|-------|----------|--------|
| Cold start latency | Medium | Django takes 30-50ms boot time atop Python runtime init |
| Silent runtime failures | High | Build succeeds but if the Django app crashes at startup, the function silently returns 500. No alert. |
| Opaque debugging | Medium | Verbose error logs require `--expand`, stack traces are stripped |
| No rolling deploys | Low | Cutover between old and new function instances can serve 500s to in-flight requests |
| 30s timeout hard cap | Medium | Any endpoint exceeding 30s (report generation, bulk ops) fails. No background workers. |
| No WebSocket support | High | The `feat/real-time-messaging` branch cannot deploy. Real-time features blocked. |
| No background tasks / cron | Medium | Periodic jobs (email digests, cleanup, reports) require a separate service |
| Migration-from-local mismatch | Low | VS Code dev uses a Docker Compose stack (Postgres, MinIO, MailHog); production is serverless — debugging env-specific bugs is harder |

## Decision Record: Should We Move the Backend?

### Options

#### A. Keep current — everything on Vercel ✅ Frontend SPA, ⚠️ Django backend

**When this makes sense:**
- Fewer than ~200 active users
- No real-time features planned for the near term
- Willing to accept silent 500s and occasional cold-start latency

**Cost:** Vercel Pro ($20/mo) or Hobby (free)
**Ops burden:** Low (one platform)

#### B. Hybrid — frontend on Vercel, backend on Render ✅✅

```
Vercel (frontend only)          Render (backend)
┌──────────────────────┐        ┌──────────────────────┐
│  Vite React SPA      │  /api/ │  Django (Gunicorn)   │
│  Vercel Edge CDN     │ ─────→ │  Daphne (WebSocket)  │
│  Preview Deploys     │  /*    │  Workers / Cron      │
│                      │ ─────→ │  PostgreSQL (Neon)   │
└──────────────────────┘        │  Supabase Storage    │
                                └──────────────────────┘
```

**When this makes sense:**
- Need real-time messaging (WebSockets)
- Want rolling deploys with zero downtime
- Want streaming logs and health checks
- Need background workers or cron jobs later
- Scaling toward 200-2000+ active users

**Cost:** Render Web Service $7-25/mo (starts at $7/mo)
**Ops burden:** Medium (two platforms, slight DNS/URL management)

#### C. Full stack on Render

**Unnecessary.** Vercel's edge CDN for the static SPA is strictly better than Render's serving. The frontend has zero server-side rendering — keeping it on Vercel costs nothing and performs better.

### Recommendation → Option B (Hybrid)

Move only the Django backend to Render. The migration is small:

1. Add `render.yaml` (infrastructure as code) to the repo
2. Replace `api/index.py` and `vercel.json` Python config with a `Procfile`
3. Update Vercel rewrites to proxy `/api/*` → Render URL
4. Promote to production — no database changes needed (Neon Postgres stays)

**Estimated effort:** A weekend. Most of the work is testing the new deployment, not writing code.

### Migration Checklist

- [ ] Add `Dockerfile` or `render.yaml` for the Django service
- [ ] Create `Procfile` with `web: daphne -b 0.0.0.0 -p $PORT config.asgi:application`
- [ ] Add `REQUIREMENTS_FILE` or ensure `requirements.txt` is in `backend/`
- [ ] Set environment variables on Render (DATABASE_URL, SECRET_KEY, etc.)
- [ ] Update `vercel.json` — remove Python routes, add proxy rewrites to Render URL
- [ ] Test preview deployment
- [ ] Migrate existing data (none needed — same Neon database)
- [ ] Update DNS / custom domain if needed
- [ ] Update docs (README, ARCHITECTURE, this file)
- [ ] Remove `api/index.py` and `api/requirements.txt` (no longer needed)

## Current Vercel Env Vars (July 2026)

| Variable | Purpose | Environment |
|----------|---------|-------------|
| `DATABASE_URL` | Neon Postgres connection string | Production |
| `SECRET_KEY` | Django secret key | Production |
| `CORS_ALLOWED_ORIGINS` | Allowed CORS origins | Production |
| `ALLOWED_HOSTS` | Allowed hostnames | Production |

## Key Contacts & Resources

- **Live site:** https://arko-internal-system.vercel.app
- **Vercel scope:** `justinebacurin1927s-projects`
- **Render account:** (not yet provisioned)
- **Neon project:** Internal-ARKO-System (ap-southeast-2)
- **Supabase project:** Internal-ARKO-System

---

*Last evaluated: 2026-07-08 — after a production outage caused by `daphne` missing from `api/requirements.txt`.*
