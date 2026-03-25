/**
 * Pagination utility for Phase 6
 * Standardizes pagination parameter parsing and validation
 */

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

/**
 * Parse and validate pagination parameters from request URL
 * @param {URL} url - The request URL object
 * @returns {{ limit: number, offset: number, errors: Array|null }}
 */
export function parsePaginationParams(url) {
  const errors = [];
  
  // Parse limit
  let limit = DEFAULT_LIMIT;
  const limitParam = url.searchParams.get('limit');
  if (limitParam !== null) {
    const parsed = parseInt(limitParam, 10);
    if (isNaN(parsed)) {
      errors.push({ field: 'limit', message: 'limit must be a valid integer' });
    } else if (parsed <= 0) {
      errors.push({ field: 'limit', message: 'limit must be greater than 0' });
    } else if (parsed > MAX_LIMIT) {
      errors.push({ field: 'limit', message: `limit must not exceed ${MAX_LIMIT}` });
    } else {
      limit = parsed;
    }
  }
  
  // Parse offset
  let offset = 0;
  const offsetParam = url.searchParams.get('offset');
  if (offsetParam !== null) {
    const parsed = parseInt(offsetParam, 10);
    if (isNaN(parsed)) {
      errors.push({ field: 'offset', message: 'offset must be a valid integer' });
    } else if (parsed < 0) {
      errors.push({ field: 'offset', message: 'offset must not be negative' });
    } else {
      offset = parsed;
    }
  }
  
  return {
    limit,
    offset,
    errors: errors.length > 0 ? errors : null
  };
}

/**
 * Build a standardized pagination response
 * @param {Array} items - The array of items to return
 * @param {number} total - The total count of all available items
 * @param {number} limit - The limit applied
 * @param {number} offset - The offset applied
 * @returns {Object} Standardized response object
 */
export function buildPaginationResponse(items, total, limit, offset) {
  return {
    items,
    total,
    limit,
    offset
  };
}

export default { parsePaginationParams, buildPaginationResponse, DEFAULT_LIMIT, MAX_LIMIT };
