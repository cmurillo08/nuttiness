Phase 1 Backend — How to run migrations and tests

Prerequisites
- Node.js >= 18
- Postgres (recommended) and `psql` available in PATH

1) Install dependencies

```bash
npm install
```

2) Apply migration to a Postgres database

Set `DATABASE_URL` accordingly (example):

```bash
export DATABASE_URL=postgres://myuser:mypassword@localhost:5432/mydb
psql "$DATABASE_URL" -f migrations/20260323_create_phase1_tables.sql
```

The migration file enables `pgcrypto` and creates tables using `gen_random_uuid()` and `numeric(12,4)` types.

3) Run backend tests (integration-style)

If you have a Postgres `DATABASE_URL` set, the test will apply the migration and run the acceptance test:

```bash
export DATABASE_URL=postgres://myuser:mypassword@localhost:5432/mydb
npm run test:backend
```

If `DATABASE_URL` is not set, the test script falls back to an in-memory sqlite3 instance as a functional check (note: sqlite differs from Postgres; this is a local fallback only):

```bash
npm run test:backend
```

Notes & blockers
- The API routes expect a running Postgres database and `process.env.DATABASE_URL` to be set for runtime operations.
- The sqlite fallback is provided for convenience in environments without Postgres but does not enforce the exact same types/constraints as Postgres (e.g., `gen_random_uuid()` and `numeric(12,4)` differences).

Running the dev server

- Ensure migrations have been applied to your Postgres instance (see step 2).
- Set `DATABASE_URL` in your environment. Example:

```bash
export DATABASE_URL=postgres://myuser:mypassword@localhost:5432/mydb
```

- Start Next.js dev server:

```bash
npm run dev
```

API notes

- All server-side validation is driven by `docs/specs/phase-1-domain.json`.
- Numeric columns use `numeric(12,4)` in the DB; the server computes and posts 4-decimal string values (e.g., `12.3400`).

Example: POST /api/sales

```bash
curl -X POST http://localhost:3000/api/sales \
	-H 'Content-Type: application/json' \
	-d '{
		"status": "prepared",
		"total_amount": 9.5000,
		"items": [
			{ "prepared_product_id": "<uuid>", "quantity": 1, "unit_price": 4.7500, "line_total": 4.7500 },
			{ "prepared_product_id": "<uuid>", "quantity": 1, "unit_price": 4.7500, "line_total": 4.7500 }
		]
	}'
```

The route will validate the payload, verify referenced `prepared_product` rows exist, compute and verify totals (4 decimal precision), and create `sales` and `sale_items` inside a single DB transaction.
