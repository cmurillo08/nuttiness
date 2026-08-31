import errors from '../../../../lib/errors';
import { getTopProducts } from '../../../../lib/db/queries/reports';

const DEFAULT_LIMIT = 3;
const MIN_LIMIT = 1;
const MAX_LIMIT = 20;

/**
 * GET /api/reports/top-products?limit=3
 * Top prepared products by units sold, counting only `paid` sales.
 * Sale lines with a NULL prepared_product_id (custom lines) are excluded.
 */
export async function GET(req) {
  const url = new URL(req.url);

  let limit = DEFAULT_LIMIT;
  const limitParam = url.searchParams.get('limit');
  if (limitParam !== null) {
    const parsed = parseInt(limitParam, 10);
    if (Number.isNaN(parsed) || parsed < MIN_LIMIT || parsed > MAX_LIMIT) {
      return errors.badRequest([{ field: 'limit', message: `limit must be an integer between ${MIN_LIMIT} and ${MAX_LIMIT}` }]);
    }
    limit = parsed;
  }

  const items = await getTopProducts({ limit });

  return errors.json({
    items,
    limit,
    status_scope: 'paid',
    generated_at: new Date().toISOString(),
  }, 200);
}
