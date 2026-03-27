import { toInteger } from '../numbers.js';
import { runDbQuery } from './_shared.js';

const CUSTOMER_SELECT = 'id, name, phone, notes, created_at, updated_at';

export async function listCustomers({ limit, offset }, db) {
  const result = await runDbQuery(db, {
    name: 'customers.list',
    text: `SELECT ${CUSTOMER_SELECT} FROM customers ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    values: [limit, offset],
  });

  return result.rows;
}

export async function countCustomers(db) {
  const result = await runDbQuery(db, {
    name: 'customers.count',
    text: 'SELECT COUNT(*) AS count FROM customers',
    values: [],
  });

  return toInteger(result.rows[0]?.count, 0);
}

export async function getCustomerById(id, db) {
  const result = await runDbQuery(db, {
    name: 'customers.getById',
    text: `SELECT ${CUSTOMER_SELECT} FROM customers WHERE id = $1`,
    values: [id],
  });

  return result.rows[0] ?? null;
}

export async function createCustomer(data, db) {
  const result = await runDbQuery(db, {
    name: 'customers.create',
    text: `INSERT INTO customers (name, phone, notes) VALUES ($1, $2, $3) RETURNING ${CUSTOMER_SELECT}`,
    values: [data.name, data.phone ?? null, data.notes ?? null],
  });

  return result.rows[0];
}

export async function updateCustomerById(id, data, db) {
  const result = await runDbQuery(db, {
    name: 'customers.updateById',
    text: `UPDATE customers SET name = $2, phone = $3, notes = $4, updated_at = now() WHERE id = $1 RETURNING ${CUSTOMER_SELECT}`,
    values: [id, data.name, data.phone ?? null, data.notes ?? null],
  });

  return result.rows[0] ?? null;
}

export async function deleteCustomerById(id, db) {
  const result = await runDbQuery(db, {
    name: 'customers.deleteById',
    text: 'DELETE FROM customers WHERE id = $1 RETURNING *',
    values: [id],
  });

  return result.rows[0] ?? null;
}
