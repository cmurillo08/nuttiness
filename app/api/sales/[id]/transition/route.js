import { runTransaction } from '../../../../../lib/db';
import errors from '../../../../../lib/errors';

const allowed = new Set(['prepared','delivered','paid','cancelled']);

export async function POST(req, { params }) {
  const { id } = await params;
  const body = await req.json();
  const to_status = body && body.to_status;
  if (!to_status || !allowed.has(to_status)) return errors.badRequest({ error: 'validation_error', message: 'invalid to_status' });

  try {
    const res = await runTransaction(async (client) => {
      const curQ = await client.query('SELECT id, status FROM sales WHERE id = $1 FOR UPDATE', [id]);
      if (curQ.rowCount === 0) throw { status: 404, message: 'sale not found' };
      const cur = curQ.rows[0];
      const from = cur.status;

      if (from === 'paid') throw { status: 403, message: 'cannot transition from paid' };

      // allowed transitions
      if (to_status === 'delivered' && from !== 'prepared') throw { status: 400, message: 'prepared -> delivered only' };
      if (to_status === 'paid' && from !== 'delivered') throw { status: 400, message: 'delivered -> paid only' };
      if (to_status === 'cancelled' && !(from === 'prepared' || from === 'delivered')) throw { status: 400, message: 'can only cancel prepared or delivered' };

      // preconditions: delivered/paid require >=1 line
      if (to_status === 'delivered' || to_status === 'paid') {
        const linesQ = await client.query('SELECT COUNT(*) FROM sale_items WHERE sale_id = $1', [id]);
        const cnt = Number(linesQ.rows[0].count || 0);
        if (cnt < 1) throw { status: 422, message: 'sale must have at least one line to transition to delivered/paid' };
      }

      await client.query('UPDATE sales SET status = $1, updated_at = now() WHERE id = $2', [to_status, id]);
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
    if (err && err.status === 403) return errors.badRequest({ error: 'forbidden', message: err.message });
    if (err && err.status === 400) return errors.badRequest({ error: 'invalid_transition', message: err.message });
    if (err && err.status === 422) return errors.badRequest({ error: 'validation_error', message: err.message });
    throw err;
  }
}
