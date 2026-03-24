import { withClient } from '../../../../lib/db';
import errors from '../../../../lib/errors';

export async function GET(req, { params }) {
  const { id } = await params;
  return await withClient(async (client) => {
    const saleQ = await client.query('SELECT s.id, s.customer_id, c.name as customer_name, s.status, s.total_amount, s.created_at, s.updated_at FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.id = $1', [id]);
    if (saleQ.rowCount === 0) return errors.notFound('sale not found');
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
    return errors.json({ ...saleQ.rows[0], lines: linesQ.rows }, 200);
  });
}
