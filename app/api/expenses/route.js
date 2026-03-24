import { withClient } from '../../../lib/db';
import validators from '../../../lib/validators';
import errors from '../../../lib/errors';

export async function GET(req) {
  const url = new URL(req.url);
  const rawLimit = parseInt(url.searchParams.get('limit') || '100', 10) || 100;
  const limit = Math.min(rawLimit, 1000);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10) || 0;

  return await withClient(async (client) => {
    const q = `
      SELECT e.*, json_build_object('id', rp.id, 'name', rp.name, 'price', rp.price, 'supplier', rp.supplier) AS raw_product
      FROM expenses e
      LEFT JOIN raw_products rp ON e.raw_product_id = rp.id
      ORDER BY purchased_at DESC
      LIMIT $1 OFFSET $2
    `
    const res = await client.query(q, [limit, offset]);
    return errors.json(res.rows, 200);
  });
}

export async function POST(req) {
  const body = await req.json();
  // Prefer schema validator if available
  if (validators && typeof validators.CreateExpense === 'function') {
    const ok = validators.CreateExpense(body);
    if (!ok) return errors.badRequest(validators.formatErrors(validators.CreateExpense.errors));
  }

  // runtime fallback validation
  const quantity = Number(body.quantity);
  const costVal = Number(body.cost ?? body.unit_cost);
  if (!Number.isFinite(quantity) || quantity <= 0) return errors.badRequest([{ message: 'quantity must be a positive number' }]);
  if (!Number.isFinite(costVal) || costVal < 0) return errors.badRequest([{ message: 'cost must be a non-negative number' }]);

  return await withClient(async (client) => {
    try {
      const cols = ['raw_product_id', 'quantity', 'cost', 'purchased_at', 'notes'];
      const vals = [body.raw_product_id || null, quantity, costVal, body.purchased_at, body.notes || null];
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
      const q = `INSERT INTO expenses (${cols.join(',')}) VALUES (${placeholders}) RETURNING *`;
      const r = await client.query(q, vals);
      return errors.json(r.rows[0], 201);
    } catch (err) {
      if (err.code === '23505') return errors.conflict();
      throw err;
    }
  });
}
