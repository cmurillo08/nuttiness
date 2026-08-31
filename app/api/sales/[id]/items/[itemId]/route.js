import errors from '../../../../../../lib/errors';
import { deleteSaleItem, updateSaleItem } from '../../../../../../lib/services/sales';

export async function PATCH(req, { params }) {
  const { id: saleId, itemId } = await params;
  const body = await req.json();
  const { quantity, unit_price } = body;

  // Validate inputs (use presence checks, not truthiness, so unit_price: 0 is accepted)
  if (quantity === undefined || quantity === null || unit_price === undefined || unit_price === null) {
    return errors.badRequest({ error: 'validation_error', details: [{ field: '', message: 'quantity and unit_price are required' }] });
  }
  const qty = Number(quantity);
  const up = Number(unit_price);
  if (!Number.isInteger(qty) || qty < 1) {
    return errors.badRequest({ error: 'validation_error', details: [{ field: 'quantity', message: 'quantity must be a positive whole number' }] });
  }
  if (!(up >= 0)) {
    return errors.badRequest({ error: 'validation_error', details: [{ field: 'unit_price', message: 'unit_price must be >= 0' }] });
  }

  try {
    const result = await updateSaleItem(saleId, itemId, { quantity: qty, unit_price: up });

    return errors.json(result, 200);
  } catch (err) {
    if (err && err.status === 400 && err.payload) return errors.badRequest(err.payload);
    if (err && err.status === 404) return errors.notFound(err.message);
    if (err && err.status === 403) return errors.badRequest({ error: 'forbidden', message: err.message });
    throw err;
  }
}

export async function DELETE(req, { params }) {
  const { id: saleId, itemId } = await params;

  try {
    const result = await deleteSaleItem(saleId, itemId);

    return errors.json(result, 200);
  } catch (err) {
    if (err && err.status === 404) return errors.notFound(err.message);
    if (err && err.status === 403) return errors.badRequest({ error: 'forbidden', message: err.message });
    throw err;
  }
}
