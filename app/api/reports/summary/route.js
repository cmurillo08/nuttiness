import { withClient } from '../../../../lib/db';
import errors from '../../../../lib/errors';

/**
 * GET /api/reports/summary
 * Returns financial summary: total expenses, total sales, and historical profit
 * per Phase 6 domain spec
 */
export async function GET(req) {
  return await withClient(async (client) => {
    try {
      // Calculate total expenses: SUM(cost) from all non-deleted expenses
      // Per domain spec: Include all non-deleted Expense records
      const expensesQuery = `
        SELECT COALESCE(SUM(cost), 0) as total_expenses_amount
        FROM expenses
      `;
      const expensesRes = await client.query(expensesQuery);
      const totalExpensesAmount = Number(expensesRes.rows[0].total_expenses_amount) || 0;

      // Calculate total sales: SUM(total_amount) from paid sales only
      const salesQuery = `
        SELECT COALESCE(SUM(total_amount), 0) as total_sales_amount
        FROM sales
        WHERE status = 'paid'
      `;
      const salesRes = await client.query(salesQuery);
      const totalSalesAmount = Number(salesRes.rows[0].total_sales_amount) || 0;

      // Calculate historical profit
      const historicalProfit = totalSalesAmount - totalExpensesAmount;

      // Get current timestamp in ISO 8601 UTC format
      const generatedAt = new Date().toISOString();

      // Build response
      const report = {
        total_expenses_amount: Number(totalExpensesAmount.toFixed(2)),
        total_sales_amount: Number(totalSalesAmount.toFixed(2)),
        historical_profit: Number(historicalProfit.toFixed(2)),
        generated_at: generatedAt
      };

      return errors.json(report, 200);
    } catch (err) {
      console.error('Error computing financial report:', err);
      return errors.serverError(err);
    }
  });
}
