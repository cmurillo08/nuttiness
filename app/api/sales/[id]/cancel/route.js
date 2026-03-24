import { runTransaction } from '../../../../../lib/db';
import errors from '../../../../../lib/errors';

export async function POST(req, { params }) {
  const { id } = await params;
  try {
    const res = await runTransaction(async (client) => {
      const curQ = await client.query('SELECT id, status FROM sales WHERE id = $1 FOR UPDATE', [id]);
      if (curQ.rowCount === 0) throw { status: 404, message: 'sale not found' };
      const from = curQ.rows[0].status;
      if (from === 'paid') throw { status: 400, message: 'cannot cancel a paid sale' };
      if (!(from === 'prepared' || from === 'delivered')) throw { status: 400, message: 'can only cancel prepared or delivered' };

      await client.query('UPDATE sales SET status = $1, updated_at = now() WHERE id = $2', ['cancelled', id]);
      const saleQ = await client.query('SELECT s.id, s.customer_id, c.name as customer_name, s.status, s.total_amount, s.created_at, s.updated_at FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.id = $1', [id]);
      const linesQ = await client.query(`
        SELECT 
          si.id, 
          si.prepared_product_id, 
          pp.name as product_name,
          si.quantity, 
          si.unit_price, 
          si.line_total 
        FROM sale_items si
        LEFT JOIN prepared_products pp ON si.prepared_product_id = pp.id
        WHERE si.sale_id = $1 
        ORDER BY si.created_at
      `, [id]);
      return { ...saleQ.rows[0], lines: linesQ.rows };
    });
    return errors.json(res, 200);
  } catch (err) {
    if (err && err.status === 404) return errors.notFound(err.message);
    if (err && err.status === 400) return errors.badRequest({ error: 'invalid_transition', message: err.message });
    throw err;
  }
}
