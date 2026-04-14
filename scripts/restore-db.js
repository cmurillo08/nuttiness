import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

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

  const result = spawnSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-f', inputPath], {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    if (result.error.code === 'ENOENT') {
      console.error('ERROR: `psql` not found in PATH. Install PostgreSQL client tools.');
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
