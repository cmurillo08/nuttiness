import errors from '../../../../../../lib/errors';
import { isUuid } from '../../../../../../lib/uuid';
import { deleteSaleCredit } from '../../../../../../lib/services/sales';

export async function DELETE(req, { params }) {
  const { id: saleId, creditId } = await params;
  if (!isUuid(saleId) || !isUuid(creditId)) return errors.badRequest([{ message: 'Invalid id format' }]);

  try {
    const result = await deleteSaleCredit(saleId, creditId);
    return errors.json(result, 200);
  } catch (err) {
    if (err && err.status === 400 && err.payload) return errors.badRequest(err.payload);
    if (err && err.status === 404) return errors.notFound(err.message);
    if (err && err.status === 409) return errors.conflict(err.message);
    throw err;
  }
}
