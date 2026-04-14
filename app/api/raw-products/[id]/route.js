import validators from '../../../../lib/validators';
import errors from '../../../../lib/errors';
import { toFiniteNumber } from '../../../../lib/db/numbers';
import { deleteRawProductById, getRawProductById, updateRawProductById } from '../../../../lib/db/queries/rawProducts';

function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function GET(req, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return errors.badRequest([{ message: 'Invalid id format' }]);

  const rawProduct = await getRawProductById(id);
  if (!rawProduct) return errors.notFound();
  return errors.json(rawProduct, 200);
}

export async function PUT(req, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return errors.badRequest([{ message: 'Invalid id format' }]);
  const body = await req.json();
  const valid = validators.UpdateRawProduct(body);
  if (!valid) return errors.badRequest(validators.formatErrors(validators.UpdateRawProduct.errors));

  try {
    const rawProduct = await updateRawProductById(id, {
      ...body,
      price: toFiniteNumber(body.price),
    });
    if (!rawProduct) return errors.notFound();
    return errors.json(rawProduct, 200);
  } catch (err) {
    if (err.code === '23505') return errors.conflict();
    throw err;
  }
}

export async function PATCH(req, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return errors.badRequest([{ message: 'Invalid id format' }]);
  const body = await req.json();

  const existing = await getRawProductById(id);
  if (!existing) return errors.notFound();
  const merged = { ...existing, ...body };
  const valid = validators.UpdateRawProduct(merged);
  if (!valid) return errors.badRequest(validators.formatErrors(validators.UpdateRawProduct.errors));

  try {
    const rawProduct = await updateRawProductById(id, {
      ...merged,
      price: toFiniteNumber(merged.price),
    });
    return errors.json(rawProduct, 200);
  } catch (err) {
    if (err.code === '23505') return errors.conflict();
    throw err;
  }
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return errors.badRequest([{ message: 'Invalid id format' }]);

  const rawProduct = await deleteRawProductById(id);
  if (!rawProduct) return errors.notFound();
  return errors.json({}, 204);
}
