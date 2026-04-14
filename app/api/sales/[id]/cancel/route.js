import errors from '../../../../../lib/errors';
import { cancelSale } from '../../../../../lib/services/sales';

export async function POST(req, { params }) {
  const { id } = await params;
  try {
    const res = await cancelSale(id);
    return errors.json(res, 200);
  } catch (err) {
    if (err && err.status === 404) return errors.notFound(err.message);
    if (err && err.status === 400) return errors.badRequest({ error: 'invalid_transition', message: err.message });
    throw err;
  }
}
