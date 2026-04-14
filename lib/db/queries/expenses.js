import { toInteger } from '../numbers.js';
import { runDbQuery } from './_shared.js';

export async function listExpenses({ limit, offset }, db) {
  const result = await runDbQuery(db, {
    name: 'expenses.list',
    text: `
      SELECT e.*, json_build_object('id', rp.id, 'name', rp.name, 'price', rp.price, 'supplier', rp.supplier) AS raw_product
      FROM expenses e
      LEFT JOIN raw_products rp ON e.raw_product_id = rp.id
      ORDER BY purchased_at DESC
      LIMIT $1 OFFSET $2
    `,
    values: [limit, offset],
  });

  return result.rows;
}

export async function countExpenses(db) {
  const result = await runDbQuery(db, {
    name: 'expenses.count',
    text: 'SELECT COUNT(*) AS count FROM expenses',
    values: [],
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
