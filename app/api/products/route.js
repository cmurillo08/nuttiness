import { withClient } from '../../../lib/db';
import validators from '../../../lib/validators';
import errors from '../../../lib/errors';
import pagination from '../../../lib/pagination';

export async function GET(req) {
  const url = new URL(req.url);
  const { limit, offset, errors: paginationErrors } = pagination.parsePaginationParams(url);
  
  if (paginationErrors) {
    return errors.badRequest(paginationErrors);
  }

  return await withClient(async (client) => {
    const res = await client.query('SELECT * FROM prepared_products ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    const totalRes = await client.query('SELECT COUNT(*) FROM prepared_products');
    const total = Number(totalRes.rows[0].count || 0);
    return errors.json(pagination.buildPaginationResponse(res.rows, total, limit, offset), 200);
  });
}

export async function POST(req) {
  const body = await req.json();
  const valid = validators.CreatePreparedProduct(body);
  if (!valid) return errors.badRequest(validators.formatErrors(validators.CreatePreparedProduct.errors));

  return await withClient(async (client) => {
    try {
      const cols = ['name','price','unit','recipe_notes'];
      const vals = [
        body.name,
        Number(body.price),
        body.unit,
        body.recipe_notes || null,
      ];
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
