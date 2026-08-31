/**
 * Sorting utility for Phase 12
 * Standardizes sort/order query parameter parsing and validation, mirroring
 * the shape of lib/pagination.js. The actual ORDER BY SQL is built in each
 * lib/db/queries/*.js module from its own whitelisted SORTABLE map — this
 * module only parses and validates the request-side params.
 */

const VALID_ORDERS = ['asc', 'desc'];

/**
 * Shared sort contract for the "simple named entity" list endpoints
 * (customers, raw-products, products): sort by name or created_at, name
 * ascending by default, created_at descending by default. Kept in one
 * place so the three endpoints can't drift from each other.
 */
export const NAME_SORT_OPTIONS = {
  allowed: ['name', 'created_at'],
  defaultSort: 'created_at',
  defaultOrder: 'desc',
  columnDefaults: { name: 'asc', created_at: 'desc' },
};

/**
 * Parse and validate sort parameters from a request URL.
 * @param {URL} url - The request URL object
 * @param {Object} options
 * @param {string[]} options.allowed - Whitelisted sort keys for this endpoint
 * @param {string} options.defaultSort - Sort key used when `sort` is omitted
 * @param {string} [options.defaultOrder='desc'] - Order used when neither `sort` nor `order` is given
 * @param {Record<string,'asc'|'desc'>} [options.columnDefaults={}] - Per-column default direction, applied when `sort` is given without `order`
 * @returns {{ sort: string, order: 'asc'|'desc', errors: Array|null }}
 */
export function parseSortParams(url, { allowed, defaultSort, defaultOrder = 'desc', columnDefaults = {} }) {
  const errors = [];

  let sort = defaultSort;
  let sortProvided = false;
  const sortParam = url.searchParams.get('sort');
  if (sortParam !== null) {
    if (!Array.isArray(allowed) || !allowed.includes(sortParam)) {
      errors.push({ field: 'sort', message: `sort must be one of: ${(allowed || []).join(', ')}` });
    } else {
      sort = sortParam;
      sortProvided = true;
    }
  }

  let order = sortProvided ? (columnDefaults[sort] || defaultOrder) : defaultOrder;
  const orderParam = url.searchParams.get('order');
  if (orderParam !== null) {
    const normalized = orderParam.toLowerCase();
    if (!VALID_ORDERS.includes(normalized)) {
      errors.push({ field: 'order', message: `order must be one of: ${VALID_ORDERS.join(', ')}` });
    } else {
      order = normalized;
    }
  }

  return {
    sort,
    order,
    errors: errors.length > 0 ? errors : null,
  };
}

const sorting = { parseSortParams };
export default sorting;
