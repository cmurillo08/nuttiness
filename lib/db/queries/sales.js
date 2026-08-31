import { normalizeMoney, sumMoney, toInteger } from '../numbers.js';
import { runDbQuery, buildOrderBy, buildDateRangeFilter } from './_shared.js';

const SALE_HEADER_SELECT = `
  SELECT
    s.id,
    s.customer_id,
    c.name AS customer_name,
    s.status,
    s.total_amount,
    s.created_at,
    s.updated_at
  FROM sales s
  LEFT JOIN customers c ON s.customer_id = c.id
`;

function saleLinesSelect(includeUnit = false) {
  return `
    SELECT
      si.id,
      si.prepared_product_id,
      pp.name AS product_name,
      ${includeUnit ? 'pp.unit,' : ''}
      si.quantity,
      si.unit_price,
      si.line_total
    FROM sale_items si
    LEFT JOIN prepared_products pp ON si.prepared_product_id = pp.id
    WHERE si.sale_id = $1
    ORDER BY si.created_at
  `;
}

// Whitelisted sort keys -> SQL expression. Never interpolate the raw query param.
const SORTABLE = Object.freeze({
  created_at: { expr: 's.created_at' },
  customer_name: { expr: 'lower(c.name)', nullsLast: true },
});
const ORDER_BY_OPTS = { defaultSort: 'created_at', tiebreaker: 's.id' };
const DATE_RANGE_COLUMN = 's.created_at';

export async function listSales({ limit, offset, status, rangeDays = null, sort = 'created_at', order = 'desc' }, db) {
  const values = [limit, offset];
  const conditions = [];

  if (status) {
    values.push(status);
    conditions.push(`s.status = $${values.length}`);
  }

  const range = buildDateRangeFilter(DATE_RANGE_COLUMN, rangeDays, values.length + 1);
  if (range.clause) {
    values.push(...range.values);
    conditions.push(range.clause);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await runDbQuery(db, {
    name: 'sales.list',
    text: `${SALE_HEADER_SELECT} ${where} ${buildOrderBy(SORTABLE, sort, order, ORDER_BY_OPTS)} LIMIT $1 OFFSET $2`,
    values,
  });

  return result.rows;
}

export async function countSales({ status, rangeDays = null } = {}, db) {
  const values = [];
  const conditions = [];

  if (status) {
    values.push(status);
    conditions.push(`s.status = $${values.length}`);
  }

  const range = buildDateRangeFilter(DATE_RANGE_COLUMN, rangeDays, values.length + 1);
  if (range.clause) {
    values.push(...range.values);
    conditions.push(range.clause);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await runDbQuery(db, {
    name: 'sales.count',
    text: `SELECT COUNT(*) AS count FROM sales s ${where}`,
    values,
  });

  return toInteger(result.rows[0]?.count, 0);
}

export async function getSaleHeaderById(id, db, { forUpdate = false } = {}) {
  const result = await runDbQuery(db, {
    name: forUpdate ? 'sales.getHeaderByIdForUpdate' : 'sales.getHeaderById',
    text: `${SALE_HEADER_SELECT} WHERE s.id = $1 ${forUpdate ? 'FOR UPDATE' : ''}`,
    values: [id],
  });

  return result.rows[0] ?? null;
}

export async function getSaleStatusRow(id, db, { forUpdate = false } = {}) {
  const result = await runDbQuery(db, {
    name: forUpdate ? 'sales.getStatusForUpdate' : 'sales.getStatus',
    text: `SELECT id, status FROM sales WHERE id = $1 ${forUpdate ? 'FOR UPDATE' : ''}`,
    values: [id],
  });

  return result.rows[0] ?? null;
}

export async function getSaleLinesBySaleId(id, db, { includeUnit = false } = {}) {
  const result = await runDbQuery(db, {
    name: includeUnit ? 'sales.getLinesWithUnit' : 'sales.getLines',
    text: saleLinesSelect(includeUnit),
    values: [id],
  });

  return result.rows;
}

export async function getSaleDetailById(id, db, { includeUnit = false } = {}) {
  const sale = await getSaleHeaderById(id, db);
  if (!sale) {
    return null;
  }

  // Credits are only ever inserted while a sale is 'delivered' (see addSaleCredit),
  // so an 'ordered'/'prepared' sale can never have any — skip the round trip.
  const canHaveCredits = sale.status !== 'ordered' && sale.status !== 'prepared';
  const [lines, credits] = await Promise.all([
    getSaleLinesBySaleId(id, db, { includeUnit }),
    canHaveCredits ? listSaleCredits(id, db) : Promise.resolve([]),
  ]);
  const amountPaid = sumMoney(credits.map((c) => c.amount));
  return {
    ...sale,
    lines,
    credits,
    amount_paid: amountPaid,
    balance_due: normalizeMoney(sale.total_amount - amountPaid),
    credit_count: credits.length,
  };
}

export async function listSaleCredits(saleId, db) {
  const result = await runDbQuery(db, {
    name: 'sales.listCredits',
    text: `
      SELECT id, sale_id, amount, notes, recorded_at, created_at, updated_at
      FROM sale_credits
      WHERE sale_id = $1
      ORDER BY recorded_at ASC, created_at ASC, id ASC
    `,
    values: [saleId],
  });

  return result.rows;
}

export async function getSaleCreditsSummary(saleId, db) {
  const result = await runDbQuery(db, {
    name: 'sales.getCreditsSummary',
    text: `
      SELECT COALESCE(SUM(amount), 0) AS amount_paid, COUNT(*) AS credit_count
      FROM sale_credits
      WHERE sale_id = $1
    `,
    values: [saleId],
  });

  const row = result.rows[0] ?? {};
  return {
    amount_paid: normalizeMoney(row.amount_paid ?? 0),
    credit_count: toInteger(row.credit_count, 0),
  };
}

export async function getSaleCreditById(saleId, creditId, db) {
  const result = await runDbQuery(db, {
    name: 'sales.getCreditById',
    text: 'SELECT * FROM sale_credits WHERE id = $1 AND sale_id = $2',
    values: [creditId, saleId],
  });

  return result.rows[0] ?? null;
}

export async function insertSaleCredit(data, db) {
  const result = await runDbQuery(db, {
    name: 'sales.insertCredit',
    text: 'INSERT INTO sale_credits (sale_id, amount, notes) VALUES ($1, $2, $3) RETURNING *',
    values: [data.sale_id, data.amount, data.notes ?? null],
  });

  return result.rows[0];
}

export async function deleteSaleCreditById(creditId, db) {
  await runDbQuery(db, {
    name: 'sales.deleteCreditById',
    text: 'DELETE FROM sale_credits WHERE id = $1',
    values: [creditId],
  });
}

export async function customerExists(id, db) {
  const result = await runDbQuery(db, {
    name: 'sales.customerExists',
    text: 'SELECT 1 FROM customers WHERE id = $1',
    values: [id],
  });

  return result.rowCount > 0;
}

export async function preparedProductExists(id, db) {
  const result = await runDbQuery(db, {
    name: 'sales.preparedProductExists',
    text: 'SELECT 1 FROM prepared_products WHERE id = $1',
    values: [id],
  });

  return result.rowCount > 0;
}

export async function createSaleRecord(data, db) {
  const result = await runDbQuery(db, {
    name: 'sales.create',
    text: 'INSERT INTO sales (customer_id, status, total_amount) VALUES ($1, $2, $3) RETURNING *',
    values: [data.customer_id, data.status, data.total_amount],
  });

  return result.rows[0];
}

export async function insertSaleItem(data, db) {
  await runDbQuery(db, {
    name: 'sales.insertItem',
    text: 'INSERT INTO sale_items (sale_id, prepared_product_id, quantity, unit_price, line_total) VALUES ($1, $2, $3, $4, $5)',
    values: [data.sale_id, data.prepared_product_id ?? null, data.quantity, data.unit_price, data.line_total],
  });
}

export async function countSaleLines(saleId, db) {
  const result = await runDbQuery(db, {
    name: 'sales.countLines',
    text: 'SELECT COUNT(*) AS count FROM sale_items WHERE sale_id = $1',
    values: [saleId],
  });

  return toInteger(result.rows[0]?.count, 0);
}

export async function getSaleItemById(saleId, itemId, db) {
  const result = await runDbQuery(db, {
    name: 'sales.getItemById',
    text: 'SELECT * FROM sale_items WHERE id = $1 AND sale_id = $2',
    values: [itemId, saleId],
  });

  return result.rows[0] ?? null;
}

export async function updateSaleItemById(itemId, data, db) {
  await runDbQuery(db, {
    name: 'sales.updateItemById',
    text: 'UPDATE sale_items SET quantity = $1, unit_price = $2, line_total = $3 WHERE id = $4',
    values: [data.quantity, data.unit_price, data.line_total, itemId],
  });
}

export async function deleteSaleItemById(itemId, db) {
  await runDbQuery(db, {
    name: 'sales.deleteItemById',
    text: 'DELETE FROM sale_items WHERE id = $1',
    values: [itemId],
  });
}

export async function getSaleItemsTotal(saleId, db) {
  const result = await runDbQuery(db, {
    name: 'sales.getItemsTotal',
    text: 'SELECT SUM(line_total) AS total FROM sale_items WHERE sale_id = $1',
    values: [saleId],
  });

  return normalizeMoney(result.rows[0]?.total ?? 0);
}

export async function updateSaleTotal(saleId, totalAmount, db) {
  await runDbQuery(db, {
    name: 'sales.updateTotal',
    text: 'UPDATE sales SET total_amount = $1, updated_at = now() WHERE id = $2',
    values: [totalAmount, saleId],
  });
}

export async function recalculateSaleTotal(saleId, db) {
  const total = await getSaleItemsTotal(saleId, db);
  await updateSaleTotal(saleId, total, db);
  return total;
}

export async function getSaleItemDetailById(itemId, db) {
  const result = await runDbQuery(db, {
    name: 'sales.getItemDetailById',
    text: `
      SELECT
        si.id,
        si.prepared_product_id,
        pp.name AS product_name,
        si.quantity,
        si.unit_price,
        si.line_total
      FROM sale_items si
      LEFT JOIN prepared_products pp ON si.prepared_product_id = pp.id
      WHERE si.id = $1
    `,
    values: [itemId],
  });

  return result.rows[0] ?? null;
}

export async function deleteSaleById(id, db) {
  const result = await runDbQuery(db, {
    name: 'sales.deleteById',
    text: 'DELETE FROM sales WHERE id = $1 RETURNING id',
    values: [id],
  });

  return result.rows[0] ?? null;
}

export async function updateSaleStatus(saleId, status, db) {
  await runDbQuery(db, {
    name: 'sales.updateStatus',
    text: 'UPDATE sales SET status = $1, updated_at = now() WHERE id = $2',
    values: [status, saleId],
  });
}
