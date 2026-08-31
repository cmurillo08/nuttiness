import { normalizeMoney, toInteger } from '../numbers.js';
import { runDbQuery } from './_shared.js';

// Phase 12: three new aggregate reports. All scoped to `sales.status = 'paid'`
// per the domain decision recorded in docs/plans/phase-12-new-improvements.md
// section 7.1 (paid sales are the canonical definition of recognized sales,
// matching lib/db/queries/metrics.js#getDashboardStats).

export async function getTopProducts({ limit }, db) {
  const result = await runDbQuery(db, {
    name: 'reports.topProducts',
    text: `
      SELECT
        pp.id AS prepared_product_id,
        pp.name AS product_name,
        pp.unit,
        SUM(si.quantity) AS total_quantity,
        SUM(si.line_total) AS total_amount
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN prepared_products pp ON si.prepared_product_id = pp.id
      WHERE s.status = 'paid' AND si.prepared_product_id IS NOT NULL
      GROUP BY pp.id, pp.name, pp.unit
      ORDER BY total_quantity DESC, lower(pp.name) ASC
      LIMIT $1
    `,
    values: [limit],
  });

  return result.rows.map((row) => ({
    prepared_product_id: row.prepared_product_id,
    product_name: row.product_name,
    unit: row.unit,
    total_quantity: toInteger(row.total_quantity, 0),
    total_amount: normalizeMoney(row.total_amount, 0),
  }));
}

export async function getTopCustomers({ limit }, db) {
  const result = await runDbQuery(db, {
    name: 'reports.topCustomers',
    text: `
      SELECT
        c.id AS customer_id,
        c.name AS customer_name,
        SUM(si.quantity) AS total_quantity,
        COUNT(DISTINCT s.id) AS order_count,
        SUM(si.line_total) AS total_amount
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN customers c ON s.customer_id = c.id
      WHERE s.status = 'paid' AND s.customer_id IS NOT NULL
      GROUP BY c.id, c.name
      ORDER BY total_quantity DESC, lower(c.name) ASC
      LIMIT $1
    `,
    values: [limit],
  });

  return result.rows.map((row) => ({
    customer_id: row.customer_id,
    customer_name: row.customer_name,
    total_quantity: toInteger(row.total_quantity, 0),
    order_count: toInteger(row.order_count, 0),
    total_amount: normalizeMoney(row.total_amount, 0),
  }));
}

export async function getSalesMonthly({ months }, db) {
  const result = await runDbQuery(db, {
    name: 'reports.salesMonthly',
    text: `
      WITH bucket AS (
        SELECT generate_series(
          date_trunc('month', now() AT TIME ZONE 'UTC') - (($1::int - 1) || ' months')::interval,
          date_trunc('month', now() AT TIME ZONE 'UTC'),
          interval '1 month'
        ) AS month_start
      ),
      paid AS (
        SELECT
          date_trunc('month', s.created_at AT TIME ZONE 'UTC') AS month_start,
          SUM(s.total_amount) AS total_amount,
          COUNT(*) AS sales_count
        FROM sales s
        WHERE s.status = 'paid'
          AND s.created_at >= (date_trunc('month', now() AT TIME ZONE 'UTC') - (($1::int - 1) || ' months')::interval) AT TIME ZONE 'UTC'
        GROUP BY 1
      )
      SELECT
        to_char(b.month_start, 'YYYY-MM') AS month,
        to_char(b.month_start, 'YYYY-MM-DD') AS month_start,
        COALESCE(p.total_amount, 0) AS total_amount,
        COALESCE(p.sales_count, 0) AS sales_count
      FROM bucket b
      LEFT JOIN paid p ON p.month_start = b.month_start
      ORDER BY b.month_start ASC
    `,
    values: [months],
  });

  return result.rows.map((row) => ({
    month: row.month,
    month_start: row.month_start,
    total_amount: normalizeMoney(row.total_amount, 0),
    sales_count: toInteger(row.sales_count, 0),
  }));
}
