import errors from '../../../../lib/errors';
import { normalizeMoney } from '../../../../lib/db/numbers';
import { getDashboardStats } from '../../../../lib/db/queries/metrics';

/**
 * GET /api/reports/summary
 * Returns financial summary: total expenses, total sales, and historical profit
 * per Phase 6 domain spec
 */
export async function GET(req) {
  try {
    const stats = await getDashboardStats();
    const report = {
      total_expenses_amount: stats.totalExpensesCost,
      total_sales_amount: stats.totalSalesAmount,
      historical_profit: normalizeMoney(stats.totalSalesAmount - stats.totalExpensesCost),
      generated_at: new Date().toISOString()
    };

    return errors.json(report, 200);
  } catch (err) {
    console.error('Error computing financial report:', err);
    return errors.serverError(err);
  }
}
