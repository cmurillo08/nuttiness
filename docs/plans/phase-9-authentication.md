# Phase 9: Authentication — Login Page & Route Protection

## Overview
Add a simple username/password login screen to the app. Credentials are stored in `.env` (no database users table). A single shared credential pair serves all 1–2 app users. All app routes are protected; unauthenticated visitors are redirected to `/login`.

## Scope

### Included
- `/login` page — username + password form
- `POST /api/auth/login` — validates credentials, issues a session cookie
- `POST /api/auth/logout` — clears the session cookie
- Next.js `middleware.js` — intercepts every request and redirects to `/login` when the session cookie is missing or invalid
- `.env` additions: `APP_USERNAME`, `APP_PASSWORD`, `SESSION_SECRET`

### NOT Included
- Database users table
- Role/permission system
- "Remember me" / expiry configuration (default: session cookie; expires when browser closes)
- OAuth, magic-link, or any third-party auth provider
- Password reset flow

---

## Domain Model

No new database entities. Credentials live exclusively in `.env`.

```
APP_USERNAME=admin
APP_PASSWORD=<chosen password>
SESSION_SECRET=<random 32+ char string>
```

---

## Backend Design

### `POST /api/auth/login`

**Request body**
```json
{ "username": "admin", "password": "s3cr3t" }
```

**Success (200)**
```json
{ "ok": true }
```
Sets an HTTP-only, `SameSite=Lax`, `Secure` (in production) cookie named `nuttiness_session` containing an HMAC-signed token. Signing uses `SESSION_SECRET` via Node.js built-in `crypto.createHmac('sha256', …)` — no extra dependencies required.

**Failure (401)**
```json
{ "error": "Invalid credentials" }
```

**Validation**
- Both fields required (non-empty strings)
- Compare against `process.env.APP_USERNAME` / `process.env.APP_PASSWORD` using `crypto.timingSafeEqual` to prevent timing attacks
- Rate-limit: not required (personal app), but failures return a consistent 401

---

### `POST /api/auth/logout`

**Request body:** none  
**Response (200):** `{ "ok": true }`  
Clears the `nuttiness_session` cookie by setting `Max-Age=0`.

---

### `middleware.js` (root of project)

- Runs on every request **except** `/login`, `/api/auth/login`, `/_next/**`, `/icons/**`, `/manifest.json`, `/favicon.ico`
- Reads the `nuttiness_session` cookie, verifies the HMAC signature using `SESSION_SECRET`
- If invalid / missing → redirect to `/login`
- If valid → allow request through

No external packages needed (`crypto` is a Node.js built-in available in the Next.js middleware runtime via `SubtleCrypto` / `globalThis.crypto`).

> **Implementation note for Backend Agent:** Use the Web Crypto API (`globalThis.crypto.subtle`) for HMAC in middleware (Edge Runtime). Use Node.js `crypto` module inside API routes (Node Runtime).

---

## Frontend Design

### `/login` page (`app/login/page.js`)

- Excluded from `AppShell` (no sidebar/nav on the login screen)
- Centered card layout; consistent with existing brand colors (warm brown `#8B6F47`)
- Fields: **Username**, **Password** (type="password")
- **Login** button — submits via `fetch` to `POST /api/auth/login`
- Inline error message on 401
- On success: `router.push('/')` to redirect to the main app

### Layout exclusion

The root `app/layout.js` wraps every page in `<AppShell>`. The login page must NOT render inside `AppShell`. The recommended pattern:

- Create `app/(app)/layout.js` that wraps children in `AppShell`
- Move all current app routes under `app/(app)/` (dashboard, products, sales, etc.)
- Keep `app/login/page.js` outside the `(app)` group — it gets the plain root layout

Alternatively (simpler, fewer file moves): detect `/login` path in `AppShell` and render `{children}` directly. Either approach is acceptable; the spec prefers the route-group approach for cleanliness.

---

## Acceptance Criteria

- [ ] Visiting any page while unauthenticated redirects to `/login`
- [ ] Correct credentials set the session cookie and redirect to `/`
- [ ] Incorrect credentials display an error message; no cookie is set
- [ ] Visiting `/login` while already authenticated redirects to `/`
- [ ] Clicking logout clears the session cookie and redirects to `/login`
- [ ] A hard page refresh on any protected route still works (session persists across refreshes via cookie)
- [ ] The login page does NOT render the sidebar or app navigation
- [ ] `SESSION_SECRET` is never exposed to the browser

---

## Environment Variables to Add to `.env`

```
# Authentication (shared credentials for all users)
APP_USERNAME=admin
APP_PASSWORD=changeme
SESSION_SECRET=replace-this-with-a-long-random-string
```

> The Backend Agent must add these keys to `.env` (with placeholder values) and document them in `README.md` or a `.env.example` file.
