import { withClient } from '../../../../lib/db';
import validators from '../../../../lib/validators';
import errors from '../../../../lib/errors';

function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function GET(req, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return errors.badRequest([{ message: 'Invalid id format' }]);
  return await withClient(async (client) => {
    const r = await client.query('SELECT * FROM expenses WHERE id = $1', [id]);
    if (r.rowCount === 0) return errors.notFound();
    return errors.json(r.rows[0], 200);
  });
}

export async function PUT(req, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return errors.badRequest([{ message: 'Invalid id format' }]);
  const body = await req.json();

  // Prefer full update validator when available
  if (validators && typeof validators.UpdateExpense === 'function') {
    const valid = validators.UpdateExpense(body);
    if (!valid) return errors.badRequest(validators.formatErrors(validators.UpdateExpense.errors));
  }

  // coerce numbers where needed
  const quantity = Number(body.quantity);
  const costVal = Number(body.cost ?? body.unit_cost);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return errors.badRequest([{ message: 'quantity must be a positive number' }]);
  }
  if (!Number.isFinite(costVal) || costVal < 0) {
    return errors.badRequest([{ message: 'cost (or unit_cost) must be a non-negative number' }]);
  }

  return await withClient(async (client) => {
    try {
      await client.query('BEGIN');
      if (body.raw_product_id) {
        const fk = await client.query('SELECT 1 FROM raw_products WHERE id = $1', [body.raw_product_id]);
        if (fk.rowCount === 0) {
          await client.query('ROLLBACK');
          return errors.notFound('raw_product not found');
        }
      }

      const q = `UPDATE expenses SET raw_product_id=$2, quantity=$3, cost=$4, purchased_at=$5, notes=$6, updated_at=now() WHERE id=$1 RETURNING *`;
      const vals = [id, body.raw_product_id || null, quantity, costVal, body.purchased_at, body.notes || null];
      const r = await client.query(q, vals);
      if (r.rowCount === 0) {
        await client.query('ROLLBACK');
        return errors.notFound();
      }
      await client.query('COMMIT');
      return errors.json(r.rows[0], 200);
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (e) {}
      if (err.code === '23505') return errors.conflict();
      throw err;
    }
  });
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return errors.badRequest([{ message: 'Invalid id format' }]);
  return await withClient(async (client) => {
    const r = await client.query('DELETE FROM expenses WHERE id=$1 RETURNING *', [id]);
    if (r.rowCount === 0) return errors.notFound();
    return errors.json({}, 204);
  });
}
