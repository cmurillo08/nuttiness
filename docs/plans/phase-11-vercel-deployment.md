# Phase 11 — Vercel Deployment

## Overview

Deploy the `nuttiness` Next.js application to Vercel with a hosted PostgreSQL database. The goal is a production-ready, publicly accessible deployment using free-tier services where possible.

The plan is split into **three stages** so you can validate each step independently before committing to the next.

---

## Stage A — Hosted Database Setup (Neon)

### Why Neon?

| Option | Free tier | Notes |
|--------|-----------|-------|
| **Neon** ⭐ | 0.5 GB storage, unlimited projects | Purpose-built for serverless/Vercel; native Vercel integration; PostgreSQL 16; instant branches |
| Supabase | 500 MB, 2 projects | Good option too, slightly heavier stack |
| Railway | $5 credit/month | Easiest UX; credit depletes without paid plan |
| Aiven | 5 GB, 1 service | More devops-oriented |

**Recommendation: Neon.** It has a first-class Vercel integration, the connection string format is identical to a local Postgres URL, and the free tier is sustainable long-term.

### Steps

1. **Create Neon account** — https://neon.tech (free, no card required)
2. **Create a new project** — choose region closest to you (e.g. `us-east-1` or `eu-central-1`)
3. **Note the connection string** — Neon gives you a `postgresql://...` URL with `?sslmode=require` appended
4. **Run migrations** against the new Neon DB:
   ```bash
   DATABASE_URL="postgresql://<neon-connection-string>" npm run test:backend
   ```
   This runs `tests/test_migrations_and_sales.js` which applies all files under `migrations/`.
5. **(Optional) Restore from backup** if you want real data:
   ```bash
   DATABASE_URL="postgresql://<neon-connection-string>" node scripts/restore-db.js backups/nuttiness_20260408_201800.sql
   ```
6. **Verify** by connecting with any Postgres client (e.g. `psql`, TablePlus, or the Neon console query editor).

---

## Stage B — Local App → Neon DB (Smoke Test)

Before touching Vercel, run the app locally pointed at the Neon database to confirm:
- All migrations are applied correctly
- Auth, products, expenses, sales, customers, and reports work end-to-end
- No local-only assumptions (e.g. `localhost` hard-coded anywhere)

### Steps

1. Update `.env.local` (or `.env`):
   ```env
   DATABASE_URL=postgresql://<neon-connection-string>
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Walk through each section: Login → Sales → Products → Expenses → Reports
4. Fix any issues before proceeding to Stage C.

### Things to watch for

| Check | What to look for |
|-------|-----------------|
| SSL | Neon requires `sslmode=require`. The `pg` / `postgres` client in `lib/db.js` may need `ssl: true` or `{ rejectUnauthorized: false }` if not already set |
| Schema | If `PGSCHEMA` is used, ensure it is set or defaults to `public` |
| Migrations idempotency | Re-running migrations should not error (use `CREATE TABLE IF NOT EXISTS`) |

---

## Stage C — Vercel Deployment

### Pre-deployment checklist

- [ ] `next.config.js` (or `.mjs`) exists and is valid
- [ ] All secrets are in environment variables (no hardcoded credentials)
- [ ] `middleware.js` auth guard works with `SESSION_SECRET` env var
- [ ] `postcss.config.cjs` removed — only `postcss.config.mjs` should exist (Vercel uses ESM)
- [ ] `public/` assets referenced by relative paths (e.g. `/karu-logo.png`)

### Steps

1. **Push code to GitHub** (if not already there) — Vercel deploys from a Git repo
2. **Import project on Vercel**:
   - Go to https://vercel.com/new
   - Select the GitHub repo `nuttiness`
   - Framework preset: **Next.js** (auto-detected)
3. **Set environment variables** in Vercel dashboard → Project → Settings → Environment Variables:
   ```
   DATABASE_URL       = <neon-connection-string>
   SESSION_SECRET     = <random 32+ char string>
   APP_USERNAME       = <your username>
   APP_PASSWORD       = <bcrypt hash>
   ```
4. **Deploy** — Vercel runs `npm run build` automatically
5. **Verify** production URL works end-to-end

### Custom domain (optional)

- In Vercel → Project → Domains: add your custom domain and follow the DNS instructions.

---

## Environment Variables Reference

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | ✅ | Neon connection string (includes `?sslmode=require`) |
| `SESSION_SECRET` | ✅ | HMAC secret for session cookies — generate with `openssl rand -hex 32` |
| `APP_USERNAME` | ✅ | Login username |
| `APP_PASSWORD` | ✅ | bcrypt hash of the login password |

---

## Potential Issues & Fixes

### SSL on Neon
If `lib/db.js` uses `pg` or `postgres` (node-postgres), add SSL config:

```js
// lib/db.js — if using the 'postgres' (postgres.js) package:
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' })

// If using 'pg' (node-postgres):
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
```

### `postcss.config.cjs` conflict
Vercel (ESM mode) may fail if both `.cjs` and `.mjs` PostCSS configs exist. Delete `postcss.config.cjs`.

### Serverless function cold starts
Vercel runs Next.js API routes as serverless functions. Connection pooling matters. Use a single shared DB client module (already done in `lib/db.js`) and avoid creating new connections per request.

### Session cookies on Vercel
Ensure `SESSION_SECRET` is set. If using `httpOnly` cookies with `sameSite: 'lax'`, no changes are needed for a same-domain deployment.

---

## Acceptance Criteria

- [ ] Neon database is created and all migrations applied
- [ ] Local app connects to Neon DB and all pages work correctly
- [ ] `postcss.config.cjs` removed (only `.mjs` remains)
- [ ] Vercel project is created and linked to the GitHub repo
- [ ] All 4 environment variables are set in Vercel
- [ ] `npm run build` passes locally before deploying
- [ ] Production URL is accessible and Login → Sales flow works
- [ ] No credentials or secrets committed to the repo

---

## Suggested Order of Work

```
Stage A  →  Stage B  →  fix any issues  →  Stage C
(Neon)      (local test)                   (Vercel)
```

Do not deploy to Vercel until Stage B passes cleanly.
