import { withClient } from '../../../lib/db';
import validators from '../../../lib/validators';
import errors from '../../../lib/errors';

export async function GET() {
  return await withClient(async (client) => {
    const res = await client.query('SELECT * FROM prepared_products ORDER BY created_at DESC LIMIT 100');
    return errors.json(res.rows, 200);
  });
}

export async function POST(req) {
  const body = await req.json();
  const valid = validators.PreparedProduct(body);
  if (!valid) return errors.badRequest(validators.PreparedProduct.errors);

  return await withClient(async (client) => {
    try {
      const cols = ['name','price','unit','recipe_notes','created_at','updated_at'];
      const vals = [body.name, body.price, body.unit, body.recipe_notes || null, body.created_at || null, body.updated_at || null];
      const placeholders = cols.map((_,i)=>`$${i+1}`).join(',');
      const q = `INSERT INTO prepared_products (${cols.join(',')}) VALUES (${placeholders}) RETURNING *`;
      const r = await client.query(q, vals);
      return errors.json(r.rows[0], 201);
    } catch (err) {
      if (err.code === '23505') return errors.conflict();
      throw err;
    }
  });
}
