import { toInteger } from '../numbers.js';
import { runDbQuery, buildOrderBy } from './_shared.js';

// Whitelisted sort keys -> SQL expression. Never interpolate the raw query param.
const SORTABLE = Object.freeze({
  name: { expr: 'lower(name)' },
  created_at: { expr: 'created_at' },
});
const ORDER_BY_OPTS = { defaultSort: 'created_at', tiebreaker: 'id' };

export async function listRawProducts({ limit, offset, sort = 'created_at', order = 'desc' }, db) {
  const result = await runDbQuery(db, {
    name: 'rawProducts.list',
    text: `SELECT * FROM raw_products ${buildOrderBy(SORTABLE, sort, order, ORDER_BY_OPTS)} LIMIT $1 OFFSET $2`,
    values: [limit, offset],
  });

  return result.rows;
}

export async function countRawProducts(db) {
  const result = await runDbQuery(db, {
    name: 'rawProducts.count',
    text: 'SELECT COUNT(*) AS count FROM raw_products',
    values: [],
  });

  return toInteger(result.rows[0]?.count, 0);
}

export async function getRawProductById(id, db) {
  const result = await runDbQuery(db, {
    name: 'rawProducts.getById',
    text: 'SELECT * FROM raw_products WHERE id = $1',
    values: [id],
  });

  return result.rows[0] ?? null;
}

export async function createRawProduct(data, db) {
  const result = await runDbQuery(db, {
    name: 'rawProducts.create',
    text: 'INSERT INTO raw_products (name, unit, price, supplier) VALUES ($1, $2, $3, $4) RETURNING *',
    values: [data.name, data.unit, data.price, data.supplier ?? null],
  });

  return result.rows[0];
}

export async function updateRawProductById(id, data, db) {
  const result = await runDbQuery(db, {
    name: 'rawProducts.updateById',
    text: 'UPDATE raw_products SET name = $2, unit = $3, price = $4, supplier = $5, updated_at = now() WHERE id = $1 RETURNING *',
    values: [id, data.name, data.unit, data.price, data.supplier ?? null],
  });

  return result.rows[0] ?? null;
}

export async function deleteRawProductById(id, db) {
  const result = await runDbQuery(db, {
    name: 'rawProducts.deleteById',
    text: 'DELETE FROM raw_products WHERE id = $1 RETURNING *',
    values: [id],
  });

  return result.rows[0] ?? null;
}
