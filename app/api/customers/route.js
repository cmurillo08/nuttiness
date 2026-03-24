import { withClient } from '../../../lib/db';
import validators from '../../../lib/validators';
import errors from '../../../lib/errors';

export async function GET(req) {
  const url = new URL(req.url);
  const rawLimit = parseInt(url.searchParams.get('limit') || '100', 10) || 100;
  const limit = Math.min(rawLimit, 1000);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10) || 0;

  return await withClient(async (client) => {
    const res = await client.query(
      'SELECT id, name, phone, notes, created_at, updated_at FROM customers ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return errors.json({ customers: res.rows }, 200);
  });
}

export async function POST(req) {
  const body = await req.json();
  const valid = validators.CreateCustomer(body);
  if (!valid) return errors.badRequest(validators.formatErrors(validators.CreateCustomer.errors));

  return await withClient(async (client) => {
    try {
      const cols = ['name', 'phone', 'notes'];
      const vals = [
        body.name,
        body.phone || null,
        body.notes || null,
      ];
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
      const q = `INSERT INTO customers (${cols.join(',')}) VALUES (${placeholders}) RETURNING id, name, phone, notes, created_at, updated_at`;
      const r = await client.query(q, vals);
      return errors.json(r.rows[0], 201);
    } catch (err) {
      if (err.code === '23505') return errors.conflict('Customer name already exists');
      throw err;
    }
  });
}
