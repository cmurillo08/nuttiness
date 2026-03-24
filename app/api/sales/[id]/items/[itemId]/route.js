import { runTransaction } from '../../../../../../lib/db';
import errors from '../../../../../../lib/errors';

function roundTwo(n) {
  return Number(Number(n).toFixed(2));
}

export async function PATCH(req, { params }) {
  const { id: saleId, itemId } = await params;
  const body = await req.json();
  const { quantity, unit_price } = body;

  // Validate inputs
  if (!quantity || !unit_price) {
    return errors.badRequest({ error: 'validation_error', details: [{ field: '', message: 'quantity and unit_price are required' }] });
  }
  const qty = Number(quantity);
  const up = Number(unit_price);
  if (!(qty > 0)) {
    return errors.badRequest({ error: 'validation_error', details: [{ field: 'quantity', message: 'quantity must be > 0' }] });
  }
  if (!(up >= 0)) {
    return errors.badRequest({ error: 'validation_error', details: [{ field: 'unit_price', message: 'unit_price must be >= 0' }] });
  }

  try {
    const result = await runTransaction(async (client) => {
      // Check sale status
      const saleQ = await client.query('SELECT status FROM sales WHERE id = $1', [saleId]);
      if (saleQ.rowCount === 0) throw { status: 404, message: 'sale not found' };
      const sale = saleQ.rows[0];
      if (sale.status === 'delivered' || sale.status === 'paid' || sale.status === 'cancelled') {
        throw { status: 403, message: `cannot edit items on a ${sale.status} sale` };
      }

      // Check item exists
      const itemQ = await client.query('SELECT * FROM sale_items WHERE id = $1 AND sale_id = $2', [itemId, saleId]);
      if (itemQ.rowCount === 0) throw { status: 404, message: 'sale item not found' };

      const lineTotal = roundTwo(qty * up);

      // Update item
      await client.query(
        'UPDATE sale_items SET quantity = $1, unit_price = $2, line_total = $3 WHERE id = $4',
        [qty, roundTwo(up), lineTotal, itemId]
      );

      // Recalculate sale total
      const totalsQ = await client.query('SELECT SUM(line_total) as total FROM sale_items WHERE sale_id = $1', [saleId]);
      const newTotal = roundTwo(Number(totalsQ.rows[0].total || 0));
      await client.query('UPDATE sales SET total_amount = $1, updated_at = now() WHERE id = $2', [newTotal, saleId]);

      // Return updated item with product info
      const updatedItemQ = await client.query(`
        SELECT 
          si.id, 
          si.prepared_product_id, 
          pp.name as product_name,
          si.quantity, 
          si.unit_price, 
          si.line_total 
        FROM sale_items si
        LEFT JOIN prepared_products pp ON si.prepared_product_id = pp.id
        WHERE si.id = $1
      `, [itemId]);

      return updatedItemQ.rows[0];
    });

    return errors.json(result, 200);
  } catch (err) {
    if (err && err.status === 404) return errors.notFound(err.message);
    if (err && err.status === 403) return errors.badRequest({ error: 'forbidden', message: err.message });
    throw err;
  }
}

export async function DELETE(req, { params }) {
  const { id: saleId, itemId } = await params;

  try {
    const result = await runTransaction(async (client) => {
      // Check sale status
      const saleQ = await client.query('SELECT status FROM sales WHERE id = $1', [saleId]);
      if (saleQ.rowCount === 0) throw { status: 404, message: 'sale not found' };
      const sale = saleQ.rows[0];
      if (sale.status === 'delivered' || sale.status === 'paid' || sale.status === 'cancelled') {
        throw { status: 403, message: `cannot delete items from a ${sale.status} sale` };
      }

      // Check item exists
      const itemQ = await client.query('SELECT * FROM sale_items WHERE id = $1 AND sale_id = $2', [itemId, saleId]);
      if (itemQ.rowCount === 0) throw { status: 404, message: 'sale item not found' };

      // Delete item
      await client.query('DELETE FROM sale_items WHERE id = $1', [itemId]);

      // Recalculate sale total
      const totalsQ = await client.query('SELECT SUM(line_total) as total FROM sale_items WHERE sale_id = $1', [saleId]);
      const newTotal = roundTwo(Number(totalsQ.rows[0].total || 0));
      await client.query('UPDATE sales SET total_amount = $1, updated_at = now() WHERE id = $2', [newTotal, saleId]);

      return { success: true };
    });

    return errors.json(result, 200);
  } catch (err) {
    if (err && err.status === 404) return errors.notFound(err.message);
    if (err && err.status === 403) return errors.badRequest({ error: 'forbidden', message: err.message });
    throw err;
  }
}
