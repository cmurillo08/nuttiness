import { normalizeMoney, toInteger } from '../numbers.js';
import { runDbQuery } from './_shared.js';

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

export async function listSales({ limit, offset, status }, db) {
  const values = [limit, offset];
  let where = '';

  if (status) {
    values.push(status);
    where = 'WHERE s.status = $3';
  }

  const result = await runDbQuery(db, {
    name: 'sales.list',
    text: `${SALE_HEADER_SELECT} ${where} ORDER BY s.created_at DESC LIMIT $1 OFFSET $2`,
    values,
  });

  return result.rows;
}

export async function countSales({ status } = {}, db) {
  const result = await runDbQuery(db, status ? {
    name: 'sales.countByStatus',
    text: 'SELECT COUNT(*) AS count FROM sales WHERE status = $1',
    values: [status],
  } : {
    name: 'sales.count',
    text: 'SELECT COUNT(*) AS count FROM sales',
    values: [],
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

  const lines = await getSaleLinesBySaleId(id, db, { includeUnit });
  return { ...sale, lines };
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

export async function updateSaleStatus(saleId, status, db) {
  await runDbQuery(db, {
    name: 'sales.updateStatus',
    text: 'UPDATE sales SET status = $1, updated_at = now() WHERE id = $2',
    values: [status, saleId],
  });
}
