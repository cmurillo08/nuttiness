import { toInteger } from '../numbers.js';
import { runDbQuery, buildOrderBy, buildDateRangeFilter } from './_shared.js';

// Whitelisted sort keys -> SQL expression. Never interpolate the raw query param.
const SORTABLE = Object.freeze({
  purchased_at: { expr: 'e.purchased_at' },
  raw_product_name: { expr: 'lower(rp.name)', nullsLast: true },
});
const ORDER_BY_OPTS = { defaultSort: 'purchased_at', tiebreaker: 'e.id' };
const DATE_RANGE_COLUMN = 'e.purchased_at';

export async function listExpenses({ limit, offset, rangeDays = null, sort = 'purchased_at', order = 'desc' }, db) {
  const values = [limit, offset];
  const conditions = [];

  const range = buildDateRangeFilter(DATE_RANGE_COLUMN, rangeDays, values.length + 1);
  if (range.clause) {
    values.push(...range.values);
    conditions.push(range.clause);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await runDbQuery(db, {
    name: 'expenses.list',
    text: `
      SELECT e.*, json_build_object('id', rp.id, 'name', rp.name, 'price', rp.price, 'supplier', rp.supplier) AS raw_product
      FROM expenses e
      LEFT JOIN raw_products rp ON e.raw_product_id = rp.id
      ${where}
      ${buildOrderBy(SORTABLE, sort, order, ORDER_BY_OPTS)}
      LIMIT $1 OFFSET $2
    `,
    values,
  });

  return result.rows;
}

export async function countExpenses({ rangeDays = null } = {}, db) {
  const values = [];
  const conditions = [];

  const range = buildDateRangeFilter(DATE_RANGE_COLUMN, rangeDays, values.length + 1);
  if (range.clause) {
    values.push(...range.values);
    conditions.push(range.clause);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await runDbQuery(db, {
    name: 'expenses.count',
    text: `SELECT COUNT(*) AS count FROM expenses e ${where}`,
    values,
  });

  return toInteger(result.rows[0]?.count, 0);
}

export async function getExpenseById(id, db) {
  const result = await runDbQuery(db, {
    name: 'expenses.getById',
    text: 'SELECT * FROM expenses WHERE id = $1',
    values: [id],
  });

  return result.rows[0] ?? null;
}

export async function createExpense(data, db) {
  const result = await runDbQuery(db, {
    name: 'expenses.create',
    text: 'INSERT INTO expenses (raw_product_id, quantity, cost, purchased_at, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    values: [data.raw_product_id ?? null, data.quantity, data.cost, data.purchased_at, data.notes ?? null],
  });

  return result.rows[0];
}

export async function rawProductExists(id, db) {
  const result = await runDbQuery(db, {
    name: 'expenses.rawProductExists',
    text: 'SELECT 1 FROM raw_products WHERE id = $1',
    values: [id],
  });

  return result.rowCount > 0;
}

export async function updateExpenseById(id, data, db) {
  const result = await runDbQuery(db, {
    name: 'expenses.updateById',
    text: 'UPDATE expenses SET raw_product_id = $2, quantity = $3, cost = $4, purchased_at = $5, notes = $6, updated_at = now() WHERE id = $1 RETURNING *',
    values: [id, data.raw_product_id ?? null, data.quantity, data.cost, data.purchased_at, data.notes ?? null],
  });

  return result.rows[0] ?? null;
}

export async function deleteExpenseById(id, db) {
  const result = await runDbQuery(db, {
    name: 'expenses.deleteById',
    text: 'DELETE FROM expenses WHERE id = $1 RETURNING *',
    values: [id],
  });

  return result.rows[0] ?? null;
}
