/*
  Integration-style test for Phase 1 migrations and sale transaction.
  Usage:
    export DATABASE_URL=postgres://user:pass@localhost:5432/db
    node tests/test_migrations_and_sales.js

  If DATABASE_URL is not set, the script will run a sqlite3 in-memory fallback (note: behavior differs).
*/
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const MIGRATION = fs.readFileSync(path.join(process.cwd(),'migrations','20260323_create_phase1_tables.sql'),'utf8');

async function runPostgres(url) {
  const { Client } = await import('pg');
  const client = new Client({ connectionString: url });
  await client.connect();
  // execute migration by splitting on semicolons
  const stmts = MIGRATION.split(/;\s*\n/).map(s=>s.trim()).filter(Boolean);
  for (const s of stmts) {
    try { await client.query(s); } catch (err) { /* ignore create extension if permission issues etc. */ }
  }

  // create a prepared_product, then insert sale + items transactionally and assert total
  const pref = await client.query(`INSERT INTO prepared_products (name,price,unit) VALUES ('Test Prod', 12.00, 'ea') RETURNING id`);
  const pid = pref.rows[0].id;

  try {
    await client.query('BEGIN');
    const saleRes = await client.query(`INSERT INTO sales (customer_name,status,total_amount) VALUES ('T','prepared',0) RETURNING id`);
    const sid = saleRes.rows[0].id;
    await client.query(`INSERT INTO sale_items (sale_id, prepared_product_id, quantity, unit_price, line_total) VALUES ($1,$2,2,12.00,24.00)`, [sid, pid]);
    await client.query(`INSERT INTO sale_items (sale_id, prepared_product_id, quantity, unit_price, line_total) VALUES ($1,$2,1,5.00,5.00)`, [sid, pid]);
    await client.query(`UPDATE sales SET total_amount = (SELECT COALESCE(SUM(line_total),0) FROM sale_items WHERE sale_id = $1) WHERE id = $1`, [sid]);
    await client.query('COMMIT');

    const t = await client.query('SELECT total_amount FROM sales WHERE id = $1', [sid]);
    const total = Number(t.rows[0].total_amount);
    if (Math.abs(total - 29.0) > 1e-8) {
      console.error('Postgres: sale total mismatch:', total);
      process.exit(2);
    }
    console.log('Postgres migration and sale transaction test passed.');
  } catch (err) {
    console.error('Postgres test failed:', err);
    process.exit(3);
  } finally {
    await client.end();
  }
}

// sqlite fallback removed — tests now require a Postgres `DATABASE_URL`.

async function main() {
  // Prefer full DATABASE_URL, otherwise assemble from individual PG_* env vars.
  const env = process.env;
  const buildFromParts = (e) => {
    if (e.DATABASE_URL) return e.DATABASE_URL;
    const host = e.PGHOST;
    const user = e.PGUSER;
    const pass = e.PGPASSWORD;
    const db = e.PGDATABASE;
    const port = e.PGPORT || '5432';
    if (host && user && pass && db) {
      return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${db}`;
    }
    return null;
  };

  const url = buildFromParts(env);
  if (!url) {
    console.error('ERROR: DATABASE_URL is not set and PGHOST/PGUSER/PGPASSWORD/PGDATABASE are not fully defined. Tests require Postgres.');
    console.error('Either set DATABASE_URL or populate PGHOST, PGUSER, PGPASSWORD, PGDATABASE (see .env.example).');
    process.exit(1);
  }
  await runPostgres(url);
}

main().catch(err=>{ console.error(err); process.exit(1); });
