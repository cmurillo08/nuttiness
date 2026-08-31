/**
 * Date range param utility for Phase 14.
 * Mirrors lib/sorting.js in shape and responsibility: parse and validate the
 * request-side `range` param, nothing else. No SQL, no DB import, no
 * Node-only dependency, so a client component may import the constants from
 * it and stay in sync with the server whitelist.
 */

export const ALLOWED_RANGES = ['30', '60', '90', 'all'];
export const DEFAULT_RANGE = '90';

// Display label per token, kept alongside ALLOWED_RANGES so the range <select>
// on every list page renders from this one whitelist instead of a hand-typed
// <option> list that can drift from it.
export const RANGE_LABELS = {
  '30': 'Last 30 days',
  '60': 'Last 60 days',
  '90': 'Last 90 days',
  all: 'All time',
};

/**
 * Parse and validate the `range` query param from a request URL.
 * @param {URL} url - The request URL object
 * @param {Object} [options]
 * @param {string[]} [options.allowed=ALLOWED_RANGES] - Whitelisted range tokens
 * @param {string} [options.defaultRange=DEFAULT_RANGE] - Value used when `range` is omitted
 * @returns {{ range: string, rangeDays: number|null, errors: Array|null }}
 *   range     - the validated token ('30' | '60' | '90' | 'all')
 *   rangeDays - integer day count, or null for 'all' (no filter)
 */
export function parseDateRangeParam(url, { allowed = ALLOWED_RANGES, defaultRange = DEFAULT_RANGE } = {}) {
  const param = url.searchParams.get('range');

  if (param === null) {
    return {
      range: defaultRange,
      rangeDays: defaultRange === 'all' ? null : parseInt(defaultRange, 10),
      errors: null,
    };
  }

  if (!allowed.includes(param)) {
    return {
      range: defaultRange,
      rangeDays: null,
      errors: [{ field: 'range', message: `range must be one of: ${allowed.join(', ')}` }],
    };
  }

  return {
    range: param,
    rangeDays: param === 'all' ? null : parseInt(param, 10),
    errors: null,
  };
}

const dateRange = { parseDateRangeParam, ALLOWED_RANGES, DEFAULT_RANGE, RANGE_LABELS };
export default dateRange;
