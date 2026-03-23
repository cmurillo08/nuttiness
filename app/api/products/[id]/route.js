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
    const r = await client.query('SELECT * FROM prepared_products WHERE id = $1', [id]);
    if (r.rowCount === 0) return errors.notFound();
    return errors.json(r.rows[0], 200);
  });
}

export async function PUT(req, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return errors.badRequest([{ message: 'Invalid id format' }]);
  const body = await req.json();
  const valid = validators.UpdatePreparedProduct(body);
  if (!valid) return errors.badRequest(validators.formatErrors(validators.UpdatePreparedProduct.errors));

  return await withClient(async (client) => {
    try {
      const q = `UPDATE prepared_products SET name=$2, price=$3, unit=$4, recipe_notes=$5, updated_at=now() WHERE id=$1 RETURNING *`;
      const vals = [id, body.name, Number(body.price), body.unit, body.recipe_notes || null];
      const r = await client.query(q, vals);
      if (r.rowCount === 0) return errors.notFound();
      return errors.json(r.rows[0], 200);
    } catch (err) {
      if (err.code === '23505') return errors.conflict();
      throw err;
    }
  });
}

export async function PATCH(req, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return errors.badRequest([{ message: 'Invalid id format' }]);
  const body = await req.json();

  return await withClient(async (client) => {
    const r0 = await client.query('SELECT * FROM prepared_products WHERE id=$1', [id]);
    if (r0.rowCount === 0) return errors.notFound();
    const existing = r0.rows[0];
    const merged = { ...existing, ...body };
    const valid = validators.UpdatePreparedProduct(merged);
    if (!valid) return errors.badRequest(validators.formatErrors(validators.UpdatePreparedProduct.errors));

    try {
      const q = `UPDATE prepared_products SET name=$2, price=$3, unit=$4, recipe_notes=$5, updated_at=now() WHERE id=$1 RETURNING *`;
      const vals = [id, merged.name, Number(merged.price), merged.unit, merged.recipe_notes || null];
      const r = await client.query(q, vals);
      return errors.json(r.rows[0], 200);
    } catch (err) {
      if (err.code === '23505') return errors.conflict();
      throw err;
    }
  });
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return errors.badRequest([{ message: 'Invalid id format' }]);
  return await withClient(async (client) => {
    const r = await client.query('DELETE FROM prepared_products WHERE id=$1 RETURNING *', [id]);
    if (r.rowCount === 0) return errors.notFound();
    return errors.json({}, 204);
  });
}
