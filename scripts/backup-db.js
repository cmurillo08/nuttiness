import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { resolvePgBinary } from './lib/pg-bin.js';

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

function timestamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
}

function main() {
  const url = getConnectionStringFromEnv(process.env);
  const schema = process.env.PGSCHEMA;
  const outArg = process.argv[2];

  const backupsDir = path.join(process.cwd(), 'backups');
  fs.mkdirSync(backupsDir, { recursive: true });

  const prefix = schema || process.env.PGDATABASE || 'backup';
  const outputPath = outArg
    ? path.resolve(process.cwd(), outArg)
    : path.join(backupsDir, `${prefix}_${timestamp()}.sql`);

  const pgDumpArgs = [
    url,
    '--format=plain',
    '--no-owner',
    '--no-privileges',
    '--file',
    outputPath,
  ];
  if (schema) pgDumpArgs.push(`--schema=${schema}`);

  const pgDumpBin = resolvePgBinary('pg_dump', 'PG_DUMP_BIN');
  console.log(`Using pg_dump: ${pgDumpBin}`);

  const result = spawnSync(
    pgDumpBin,
    pgDumpArgs,
    {
      stdio: 'inherit',
      env: process.env,
    },
  );

  if (result.error) {
    if (result.error.code === 'ENOENT') {
      console.error(`ERROR: \`${pgDumpBin}\` not found. Install PostgreSQL client tools or set PG_DUMP_BIN.`);
    } else {
      console.error('ERROR running pg_dump:', result.error.message);
    }
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }

  console.log(`Backup complete: ${outputPath}`);
}

main();
