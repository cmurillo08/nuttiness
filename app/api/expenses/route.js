import { withClient } from '../../../lib/db';
import validators from '../../../lib/validators';
import errors from '../../../lib/errors';

export async function GET() {
  return await withClient(async (client) => {
    const res = await client.query('SELECT * FROM expenses ORDER BY purchased_at DESC LIMIT 100');
    return errors.json(res.rows, 200);
  });
}

export async function POST(req) {
  const body = await req.json();
  const valid = validators.Expense(body);
  if (!valid) return errors.badRequest(validators.Expense.errors);

  return await withClient(async (client) => {
    // verify raw_product exists
    const fk = await client.query('SELECT 1 FROM raw_products WHERE id = $1', [body.raw_product_id]);
    if (fk.rowCount === 0) return errors.notFound('raw_product not found');

    try {
      const cols = ['raw_product_id','quantity','unit_cost','purchased_at','notes','created_at','updated_at'];
      const vals = [body.raw_product_id, body.quantity, body.unit_cost, body.purchased_at, body.notes || null, body.created_at || null, body.updated_at || null];
      const placeholders = cols.map((_,i)=>`$${i+1}`).join(',');
      const q = `INSERT INTO expenses (${cols.join(',')}) VALUES (${placeholders}) RETURNING *`;
      const r = await client.query(q, vals);
      return errors.json(r.rows[0], 201);
    } catch (err) {
      if (err.code === '23505') return errors.conflict();
      throw err;
    }
  });
}
