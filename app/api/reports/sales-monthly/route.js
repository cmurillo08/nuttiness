import errors from '../../../../lib/errors';
import { getSalesMonthly } from '../../../../lib/db/queries/reports';

const DEFAULT_MONTHS = 12;
const MIN_MONTHS = 1;
const MAX_MONTHS = 36;

/**
 * GET /api/reports/sales-monthly?months=12
 * Trailing `months` buckets ending with the current month (UTC), zero-filled,
 * counting only `paid` sales.
 */
export async function GET(req) {
  const url = new URL(req.url);

  let months = DEFAULT_MONTHS;
  const monthsParam = url.searchParams.get('months');
  if (monthsParam !== null) {
    const parsed = parseInt(monthsParam, 10);
    if (Number.isNaN(parsed) || parsed < MIN_MONTHS || parsed > MAX_MONTHS) {
      return errors.badRequest([{ field: 'months', message: `months must be an integer between ${MIN_MONTHS} and ${MAX_MONTHS}` }]);
    }
    months = parsed;
  }

  const items = await getSalesMonthly({ months });

  return errors.json({
    items,
    months,
    status_scope: 'paid',
    generated_at: new Date().toISOString(),
  }, 200);
}
