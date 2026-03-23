import { withClient } from '../../../lib/db';
import validators from '../../../lib/validators';
import errors from '../../../lib/errors';

export async function GET(req) {
  const url = new URL(req.url);
  const rawLimit = parseInt(url.searchParams.get('limit') || '100', 10) || 100;
  const limit = Math.min(rawLimit, 1000);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10) || 0;

  return await withClient(async (client) => {
    const res = await client.query('SELECT * FROM raw_products ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    return errors.json(res.rows, 200);
  });
}

export async function POST(req) {
  const body = await req.json();
  const valid = validators.CreateRawProduct(body);
  if (!valid) return errors.badRequest(validators.formatErrors(validators.CreateRawProduct.errors));

  return await withClient(async (client) => {
    try {
      const cols = ['name','unit','unit_price','unit_size','supplier','notes'];
      const vals = [
        body.name,
        body.unit,
        Number(body.unit_price),
        Number(body.unit_size),
        body.supplier || null,
        body.notes || null,
      ];
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
