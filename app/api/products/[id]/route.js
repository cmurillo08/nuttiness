import validators from '../../../../lib/validators';
import errors from '../../../../lib/errors';
import { toFiniteNumber } from '../../../../lib/db/numbers';
import {
  deletePreparedProductById,
  getPreparedProductById,
  updatePreparedProductById,
} from '../../../../lib/db/queries/products';

function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function GET(req, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return errors.badRequest([{ message: 'Invalid id format' }]);

  const product = await getPreparedProductById(id);
  if (!product) return errors.notFound();
  return errors.json(product, 200);
}

export async function PUT(req, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return errors.badRequest([{ message: 'Invalid id format' }]);
  const body = await req.json();
  const valid = validators.UpdatePreparedProduct(body);
  if (!valid) return errors.badRequest(validators.formatErrors(validators.UpdatePreparedProduct.errors));

  try {
    const product = await updatePreparedProductById(id, {
      ...body,
      price: toFiniteNumber(body.price),
    });
    if (!product) return errors.notFound();
    return errors.json(product, 200);
  } catch (err) {
    if (err.code === '23505') return errors.conflict();
    throw err;
  }
}

export async function PATCH(req, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return errors.badRequest([{ message: 'Invalid id format' }]);
  const body = await req.json();

  const existing = await getPreparedProductById(id);
  if (!existing) return errors.notFound();
  const merged = { ...existing, ...body };
  const valid = validators.UpdatePreparedProduct(merged);
  if (!valid) return errors.badRequest(validators.formatErrors(validators.UpdatePreparedProduct.errors));

  try {
    const product = await updatePreparedProductById(id, {
      ...merged,
      price: toFiniteNumber(merged.price),
    });
    return errors.json(product, 200);
  } catch (err) {
    if (err.code === '23505') return errors.conflict();
    throw err;
  }
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return errors.badRequest([{ message: 'Invalid id format' }]);

  const product = await deletePreparedProductById(id);
  if (!product) return errors.notFound();
  return errors.json({}, 204);
}
