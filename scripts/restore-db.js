import 'dotenv/config';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { spawnSync } from 'node:child_process';
import { resolvePgBinary } from './lib/pg-bin.js';

// pg_dump's preamble stamps `SET <param> = ...;` lines using its own version's
// defaults, not the target server's. If the dump was made with a newer
// pg_dump than the server you're restoring into, one of these can be a
// parameter that server predates (e.g. `transaction_timeout`, added in PG 17)
// and psql aborts before touching any data. They're just session-timeout
// knobs, safe to drop when the target server doesn't recognize them.
const DROPPABLE_PREAMBLE_PARAMS = ['transaction_timeout'];
const DROPPABLE_PREAMBLE_PATTERN = new RegExp(
  `^SET (?:${DROPPABLE_PREAMBLE_PARAMS.join('|')}) = .*;$`
);

// pg_dump always emits its preamble SETs before any real SQL, well within the
// first few dozen lines. Capping the peek here means a dump with none of
// these lines (the common case) is never read into memory in full.
const PREAMBLE_SCAN_LINES = 200;

function isDroppablePreambleLine(line) {
  return DROPPABLE_PREAMBLE_PATTERN.test(line);
}

// Peeks at just the header window instead of buffering the whole file, so a
// multi-gigabyte dump costs a few hundred lines of memory, not the whole file.
async function fileHasDroppablePreamble(inputPath) {
  const rl = readline.createInterface({
    input: fs.createReadStream(inputPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  try {
    let lineNo = 0;
    for await (const line of rl) {
      if (isDroppablePreambleLine(line)) return true;
      if (++lineNo >= PREAMBLE_SCAN_LINES) return false;
    }
    return false;
  } finally {
    rl.close();
  }
}

// Streams inputPath to outputPath line-by-line, dropping unsupported preamble
// SETs. Never holds more than one line in memory, so this is safe for
// multi-gigabyte dumps.
async function writeWithoutUnsupportedPreamble(inputPath, outputPath) {
  const rl = readline.createInterface({
    input: fs.createReadStream(inputPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  const out = fs.createWriteStream(outputPath);
  for await (const line of rl) {
    if (isDroppablePreambleLine(line)) continue;
    out.write(line + '\n');
  }
  await new Promise((resolve, reject) => {
    out.end((err) => (err ? reject(err) : resolve()));
  });
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

// Tracks the one temp dir this process may create so it can be removed on
// any exit path: normal completion, an uncaught error, or Ctrl+C/SIGTERM.
let tempDir = null;
function cleanupTempDir() {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
}
process.on('exit', cleanupTempDir);
process.on('SIGINT', () => {
  cleanupTempDir();
  process.exit(130);
});
process.on('SIGTERM', () => {
  cleanupTempDir();
  process.exit(143);
});

async function main() {
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

  let restorePath = inputPath;
  if (await fileHasDroppablePreamble(inputPath)) {
    // mkdtemp's random suffix keeps concurrent restores of same-named files
    // from colliding on the same path, unlike a Date.now()-based name.
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'restore-db-'));
    restorePath = path.join(tempDir, path.basename(inputPath));
    await writeWithoutUnsupportedPreamble(inputPath, restorePath);
    console.log('Note: dropped preamble SET(s) unsupported by the target server version.');
  }

  const psqlBin = resolvePgBinary('psql', 'PSQL_BIN');
  console.log(`Using psql: ${psqlBin}`);

  const result = spawnSync(psqlBin, [url, '-v', 'ON_ERROR_STOP=1', '-f', restorePath], {
    stdio: 'inherit',
    env: process.env,
  });

  cleanupTempDir();

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

main().catch((err) => {
  cleanupTempDir();
  console.error('ERROR:', err.message);
  process.exit(1);
});
