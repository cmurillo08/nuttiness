import 'dotenv/config';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { resolvePgBinary } from './lib/pg-bin.js';

// pg_dump's preamble stamps `SET <param> = ...;` lines using its own version's
// defaults, not the target server's. If the dump was made with a newer
// pg_dump than the server you're restoring into, one of these can be a
// parameter that server predates (e.g. `transaction_timeout`, added in PG 17)
// and psql aborts before touching any data. They're just session-timeout
// knobs, safe to drop when the target server doesn't recognize them.
const DROPPABLE_PREAMBLE_PARAMS = ['transaction_timeout'];

function stripUnsupportedPreambleSettings(sql) {
  const pattern = new RegExp(`^SET (?:${DROPPABLE_PREAMBLE_PARAMS.join('|')}) = .*;$\\n?`, 'gm');
  return sql.replace(pattern, '');
}

function getConnectionStringFromEnv(env) {
  const host = env.PGHOST;
  const user = env.PGUSER;
  const pass = env.PGPASSWORD;
  const db = env.PGDATABASE;
  const port = env.PGPORT || '5432';

  if (!host || !user || !pass || !db) {
    console.error('ERROR: Missing required env vars.');
    console.error('Set PGHOST, PGUSER, PGPASSWORD, PGDATABASE (optional: PGPORT).');
    process.exit(1);
  }

  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${db}`;
}

function main() {
  const inputArg = process.argv[2];
  if (!inputArg) {
    console.error('Usage: npm run restore:db -- backups/your-file.sql');
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), inputArg);
  if (!fs.existsSync(inputPath)) {
    console.error(`ERROR: SQL file not found: ${inputPath}`);
    process.exit(1);
  }

  const url = getConnectionStringFromEnv(process.env);

  const rawSql = fs.readFileSync(inputPath, 'utf8');
  const sql = stripUnsupportedPreambleSettings(rawSql);

  let restorePath = inputPath;
  let tempFile = null;
  if (sql !== rawSql) {
    tempFile = path.join(os.tmpdir(), `restore-${Date.now()}-${path.basename(inputPath)}`);
    fs.writeFileSync(tempFile, sql);
    restorePath = tempFile;
    console.log('Note: dropped preamble SET(s) unsupported by the target server version.');
  }

  const psqlBin = resolvePgBinary('psql', 'PSQL_BIN');
  console.log(`Using psql: ${psqlBin}`);

  const result = spawnSync(psqlBin, [url, '-v', 'ON_ERROR_STOP=1', '-f', restorePath], {
    stdio: 'inherit',
    env: process.env,
  });

  if (tempFile) fs.rmSync(tempFile, { force: true });

  if (result.error) {
    if (result.error.code === 'ENOENT') {
      console.error(`ERROR: \`${psqlBin}\` not found. Install PostgreSQL client tools or set PSQL_BIN.`);
    } else {
      console.error('ERROR running psql:', result.error.message);
    }
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }

  console.log(`Restore complete from: ${inputPath}`);
}

main();
