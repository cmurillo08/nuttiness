import errors from '../../../../lib/errors';
import { isUuid } from '../../../../lib/uuid';
import { getSaleDetailById } from '../../../../lib/db/queries/sales';
import { deleteSale } from '../../../../lib/services/sales';

export async function GET(req, { params }) {
  const { id } = await params;

  const sale = await getSaleDetailById(id, null, { includeUnit: true });
  if (!sale) return errors.notFound('sale not found');
  return errors.json(sale, 200);
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return errors.badRequest([{ message: 'Invalid id format' }]);

  try {
    await deleteSale(id);
    return errors.json({}, 204);
  } catch (err) {
    if (err && err.status === 404) return errors.notFound(err.message);
    if (err && err.status === 409) return errors.conflict(err.message);
    throw err;
  }
}
