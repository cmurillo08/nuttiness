import { query, queryWith } from '../../db.js';

export async function runDbQuery(db, config) {
  return db ? queryWith(db, config) : query(config);
}

/**
 * Build a safe `ORDER BY` clause from a whitelisted sort-key map (Phase 12).
 * The caller's `sort`/`order` values must already be validated against
 * `sortable`'s keys (see lib/sorting.js) before this is called — this
 * function never interpolates unvalidated input, and always appends a
 * deterministic tiebreaker so pagination is stable when many rows share a
 * sort value.
 *
 * @param {Record<string, {expr: string, nullsLast?: boolean}>} sortable - whitelisted sort key -> SQL expression
 * @param {string} sort - a key of `sortable` (falls back to `defaultSort` if unknown)
 * @param {string} order - 'asc' | 'desc'
 * @param {{ defaultSort: string, tiebreaker: string }} options
 */
export function buildOrderBy(sortable, sort, order, { defaultSort, tiebreaker }) {
  const column = sortable[sort] || sortable[defaultSort];
  const direction = order === 'asc' ? 'ASC' : 'DESC';
  const nulls = column.nullsLast ? ' NULLS LAST' : '';
  return `ORDER BY ${column.expr} ${direction}${nulls}, ${tiebreaker} ASC`;
}

/**
 * Build a safe date-range predicate for the whitelisted `range` param
 * (see lib/dateRange.js). `columnExpr` is a fixed, module-owned column
 * reference — never user input — and the day count is bound as a
 * parameter, so nothing from the request is interpolated into SQL.
 *
 * The cutoff is computed in UTC, truncated to the start of the day (Phase 14
 * §1.4 / §2.3). Do not simplify the double `AT TIME ZONE 'UTC'` round-trip —
 * it is what makes the cutoff independent of the server/session TimeZone.
 *
 * @param {string} columnExpr - e.g. 's.created_at'
 * @param {number|null} rangeDays - integer day count, or null for "all"
 * @param {number} paramIndex - 1-based index this clause's parameter will occupy
 * @returns {{ clause: string|null, values: number[] }}
 */
export function buildDateRangeFilter(columnExpr, rangeDays, paramIndex) {
  if (rangeDays == null) {
    return { clause: null, values: [] };
  }

  if (!Number.isInteger(rangeDays) || rangeDays <= 0) {
    return { clause: null, values: [] };
  }

  const clause = `${columnExpr} >= (date_trunc('day', now() AT TIME ZONE 'UTC') - make_interval(days => $${paramIndex}::int)) AT TIME ZONE 'UTC'`;
  return { clause, values: [rangeDays] };
}
