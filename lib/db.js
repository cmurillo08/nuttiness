import { Pool } from 'pg';

const schema = process.env.PGSCHEMA;
if (schema && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
  throw new Error(`[db] Invalid PGSCHEMA value: "${schema}". Must be alphanumeric/underscore only.`);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  // Set search_path so all queries resolve to the app schema first.
  // public is kept second so pgcrypto functions (gen_random_uuid) remain accessible.
  ...(schema && { options: `-c search_path=${schema},public` }),
});
const SLOW_QUERY_MS = Number(process.env.DB_SLOW_QUERY_MS || 250);

function normalizeQueryConfig(textOrConfig, params) {
  if (typeof textOrConfig === 'string') {
    return {
      name: undefined,
      text: textOrConfig,
      values: params || [],
    };
  }

  return {
    name: textOrConfig?.name,
    text: textOrConfig?.text,
    values: textOrConfig?.values || [],
  };
}

async function executeQuery(target, textOrConfig, params) {
  const config = normalizeQueryConfig(textOrConfig, params);
  const startedAt = Date.now();

  try {
    const result = await target.query(config.text, config.values);
    const durationMs = Date.now() - startedAt;

    if (durationMs >= SLOW_QUERY_MS) {
      console.warn('[db] slow query', {
        name: config.name || 'anonymous',
        durationMs,
      });
    }

    return result;
  } catch (error) {
    console.error('[db] query failed', {
      name: config.name || 'anonymous',
      message: error.message,
    });
    throw error;
  }
}

export async function query(textOrConfig, params) {
  return executeQuery(pool, textOrConfig, params);
}

export async function queryWith(client, textOrConfig, params) {
  return executeQuery(client, textOrConfig, params);
}

export async function runTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await fn(client);
    await client.query('COMMIT');
    return res;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    throw err;
  } finally {
    client.release();
  }
}

const db = { query, runTransaction };
export default db;
