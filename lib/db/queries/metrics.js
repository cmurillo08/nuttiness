import { normalizeMoney, toInteger } from '../numbers.js';
import { runDbQuery } from './_shared.js';

export async function getDashboardStats(db) {
  const result = await runDbQuery(db, {
    name: 'metrics.dashboardStats',
    text: `
      SELECT
        (SELECT COUNT(*) FROM prepared_products) AS products,
        (SELECT COUNT(*) FROM raw_products) AS raw_products,
        (SELECT COUNT(*) FROM expenses) AS expenses,
        (SELECT COUNT(*) FROM sales) AS sales,
        (SELECT COUNT(*) FROM customers) AS customers,
        (SELECT COALESCE(SUM(cost), 0) FROM expenses) AS total_expenses_cost,
        (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE status = 'paid') AS total_sales_amount
    `,
    values: [],
  });

  const row = result.rows[0] ?? {};

  return {
    products: toInteger(row.products, 0),
    rawProducts: toInteger(row.raw_products, 0),
    expenses: toInteger(row.expenses, 0),
    sales: toInteger(row.sales, 0),
    customers: toInteger(row.customers, 0),
    totalExpensesCost: normalizeMoney(row.total_expenses_cost, 0),
    totalSalesAmount: normalizeMoney(row.total_sales_amount, 0),
  };
}
