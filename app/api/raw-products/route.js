import { withClient } from '../../../lib/db';
import validators from '../../../lib/validators';
import errors from '../../../lib/errors';

export async function GET() {
  return await withClient(async (client) => {
    const res = await client.query('SELECT * FROM raw_products ORDER BY created_at DESC LIMIT 100');
    return errors.json(res.rows, 200);
  });
}

export async function POST(req) {
  const body = await req.json();
  const valid = validators.RawProduct(body);
  if (!valid) return errors.badRequest(validators.RawProduct.errors);

  return await withClient(async (client) => {
    try {
      const cols = ['name','unit','unit_price','unit_size','created_at','updated_at'];
      const vals = [body.name, body.unit, body.unit_price, body.unit_size, body.created_at || null, body.updated_at || null];
      const placeholders = cols.map((_,i)=>`$${i+1}`).join(',');
      const q = `INSERT INTO raw_products (${cols.join(',')}) VALUES (${placeholders}) RETURNING *`;
      const r = await client.query(q, vals);
      return errors.json(r.rows[0], 201);
    } catch (err) {
      if (err.code === '23505') return errors.conflict();
      throw err;
    }
  });
}
