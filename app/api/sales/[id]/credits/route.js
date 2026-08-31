import validators from '../../../../../lib/validators';
import errors from '../../../../../lib/errors';
import { isUuid } from '../../../../../lib/uuid';
import { addSaleCredit } from '../../../../../lib/services/sales';

export async function POST(req, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return errors.badRequest([{ message: 'Invalid id format' }]);

  const body = await req.json();

  if (!validators.SaleCreditCreate(body)) {
    return errors.badRequest(validators.formatErrors(validators.SaleCreditCreate.errors));
  }

  try {
    const result = await addSaleCredit(id, body);
    return errors.json(result, 201);
  } catch (err) {
    if (err && err.status === 400 && err.payload) return errors.badRequest(err.payload);
    if (err && err.status === 404) return errors.notFound(err.message);
    if (err && err.status === 409) return errors.conflict(err.message);
    throw err;
  }
}
