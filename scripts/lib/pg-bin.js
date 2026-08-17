import fs from 'node:fs';

const KEG_ROOTS = ['/opt/homebrew/opt', '/usr/local/opt'];
// Newest-first so a mismatch against a newer server (e.g. after a Neon version
// bump) gets picked up automatically without touching this list.
const PG_VERSIONS = ['18', '17', '16', '15', '14', '13'];

/**
 * Resolve which Postgres client binary (pg_dump, psql, ...) to run.
 *
 * Priority:
 *   1. `process.env[envVarName]` if set — explicit override always wins.
 *   2. The newest Homebrew `postgresql@N` keg that has this binary, since
 *      keg-only versions (anything but the currently-linked one) don't show
 *      up on PATH.
 *   3. The bare binary name, resolved via PATH (today's default behavior).
 */
export function resolvePgBinary(binName, envVarName) {
  const override = process.env[envVarName];
  if (override) return override;

  for (const version of PG_VERSIONS) {
    for (const root of KEG_ROOTS) {
      const candidate = `${root}/postgresql@${version}/bin/${binName}`;
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  return binName;
}
