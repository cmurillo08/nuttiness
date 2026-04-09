#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# migrate-to-personal-projects.sh
#
# Migrates all tables + data from:
#   database: nuttiness   schema: public
# to:
#   database: personal_projects   schema: nuttiness
#
# Prerequisites:
#   - PGHOST / PGPORT / PGUSER / PGPASSWORD must be set (or loaded from .env)
#   - pg_dump, pg_restore, psql must be on PATH
#   - The source database (nuttiness) must be accessible
#
# Usage:
#   bash scripts/migrate-to-personal-projects.sh
# ---------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# Load .env if present (exports PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE…)
if [[ -f "$REPO_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
  echo "[info] Loaded .env"
fi

SOURCE_DB="${PGDATABASE:-nuttiness}"
TARGET_DB="personal_projects"
TARGET_SCHEMA="nuttiness"
DUMP_FILE="/tmp/${SOURCE_DB}_to_${TARGET_DB}_$(date +%Y%m%d_%H%M%S).dump"

echo ""
echo "============================================================"
echo " Migration plan"
echo "   Source : database=$SOURCE_DB  schema=public"
echo "   Target : database=$TARGET_DB  schema=$TARGET_SCHEMA"
echo "   Dump   : $DUMP_FILE"
echo "============================================================"
echo ""

# ---------------------------------------------------------------------------
# Step 1 – Create target database
# ---------------------------------------------------------------------------
echo "--> [1/4] Creating database '$TARGET_DB' (skips if already exists)…"
psql \
  --host="${PGHOST:-localhost}" \
  --port="${PGPORT:-5432}" \
  --username="${PGUSER:-postgres}" \
  --dbname="postgres" \
  --no-password \
  -c "CREATE DATABASE ${TARGET_DB};" 2>/dev/null \
  && echo "    Created '$TARGET_DB'." \
  || echo "    '$TARGET_DB' already exists — continuing."

# ---------------------------------------------------------------------------
# Step 2 – Dump source (public schema only, custom format)
# ---------------------------------------------------------------------------
echo ""
echo "--> [2/4] Dumping '$SOURCE_DB' (public schema)…"
pg_dump \
  --host="${PGHOST:-localhost}" \
  --port="${PGPORT:-5432}" \
  --username="${PGUSER:-postgres}" \
  --schema=public \
  --no-owner \
  --no-acl \
  --format=custom \
  "$SOURCE_DB" > "$DUMP_FILE"
echo "    Dump written to $DUMP_FILE"

# ---------------------------------------------------------------------------
# Step 3 – Restore into personal_projects (lands in public schema)
# ---------------------------------------------------------------------------
echo ""
echo "--> [3/4] Restoring dump into '$TARGET_DB'…"
pg_restore \
  --host="${PGHOST:-localhost}" \
  --port="${PGPORT:-5432}" \
  --username="${PGUSER:-postgres}" \
  --no-owner \
  --no-acl \
  --no-privileges \
  --exit-on-error=false \
  --dbname="$TARGET_DB" \
  "$DUMP_FILE" || true
echo "    Restore complete."

# ---------------------------------------------------------------------------
# Step 4 – Create nuttiness schema and move all tables into it
# ---------------------------------------------------------------------------
echo ""
echo "--> [4/4] Creating schema '$TARGET_SCHEMA' and moving tables…"
psql \
  --host="${PGHOST:-localhost}" \
  --port="${PGPORT:-5432}" \
  --username="${PGUSER:-postgres}" \
  --dbname="$TARGET_DB" <<SQL
-- Create target schema (idempotent)
CREATE SCHEMA IF NOT EXISTS ${TARGET_SCHEMA};

-- Move every table from public → nuttiness
DO \$\$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename
    FROM   pg_tables
    WHERE  schemaname = 'public'
    ORDER  BY tablename
  LOOP
    RAISE NOTICE 'Moving table: %', tbl;
    EXECUTE format('ALTER TABLE public.%I SET SCHEMA ${TARGET_SCHEMA}', tbl);
  END LOOP;
END;
\$\$;

-- Confirm result
SELECT schemaname, tablename
FROM   pg_tables
WHERE  schemaname = '${TARGET_SCHEMA}'
ORDER  BY tablename;
SQL

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo "============================================================"
echo " Migration complete!"
echo "============================================================"
echo ""
echo " Next steps:"
echo "   1. Update your .env:"
echo "        PGDATABASE=personal_projects"
echo "        PGSCHEMA=nuttiness"
echo "        (keep PGHOST / PGPORT / PGUSER / PGPASSWORD as-is)"
echo ""
echo "   2. Restart the dev server:  npm run dev"
echo ""
echo "   3. Smoke-test the app, then (optionally) drop the old DB:"
echo "        psql -U \$PGUSER -d postgres -c 'DROP DATABASE nuttiness;'"
echo ""
echo "   Dump kept at: $DUMP_FILE"
echo "   Remove it when no longer needed."
echo ""
