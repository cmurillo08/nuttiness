import { toInteger } from '../numbers.js';
import { runDbQuery } from './_shared.js';

export async function listPreparedProducts({ limit, offset }, db) {
  const result = await runDbQuery(db, {
    name: 'products.list',
    text: 'SELECT * FROM prepared_products ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    values: [limit, offset],
  });

  return result.rows;
}

export async function countPreparedProducts(db) {
  const result = await runDbQuery(db, {
    name: 'products.count',
    text: 'SELECT COUNT(*) AS count FROM prepared_products',
    values: [],
  });

  return toInteger(result.rows[0]?.count, 0);
}

export async function getPreparedProductById(id, db) {
  const result = await runDbQuery(db, {
    name: 'products.getById',
    text: 'SELECT * FROM prepared_products WHERE id = $1',
    values: [id],
  });

  return result.rows[0] ?? null;
}

export async function createPreparedProduct(data, db) {
  const result = await runDbQuery(db, {
    name: 'products.create',
    text: 'INSERT INTO prepared_products (name, price, unit, recipe_notes) VALUES ($1, $2, $3, $4) RETURNING *',
    values: [data.name, data.price, data.unit, data.recipe_notes ?? null],
  });

  return result.rows[0];
}

export async function updatePreparedProductById(id, data, db) {
  const result = await runDbQuery(db, {
    name: 'products.updateById',
    text: 'UPDATE prepared_products SET name = $2, price = $3, unit = $4, recipe_notes = $5, updated_at = now() WHERE id = $1 RETURNING *',
    values: [id, data.name, data.price, data.unit, data.recipe_notes ?? null],
  });

  return result.rows[0] ?? null;
}

export async function deletePreparedProductById(id, db) {
  const result = await runDbQuery(db, {
    name: 'products.deleteById',
    text: 'DELETE FROM prepared_products WHERE id = $1 RETURNING *',
    values: [id],
  });

  return result.rows[0] ?? null;
}
