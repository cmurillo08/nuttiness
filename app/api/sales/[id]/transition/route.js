import errors from '../../../../../lib/errors';
import { transitionSale } from '../../../../../lib/services/sales';

const allowed = new Set(['prepared','delivered','paid','cancelled']);

export async function POST(req, { params }) {
  const { id } = await params;
  const body = await req.json();
  const to_status = body && body.to_status;
  if (!to_status || !allowed.has(to_status)) return errors.badRequest({ error: 'validation_error', message: 'invalid to_status' });

  try {
    const res = await transitionSale(id, to_status);

    return errors.json(res, 200);
  } catch (err) {
    if (err && err.status === 404) return errors.notFound(err.message);
    if (err && err.status === 403) return errors.badRequest({ error: 'forbidden', message: err.message });
    if (err && err.status === 400) return errors.badRequest({ error: 'invalid_transition', message: err.message });
    if (err && err.status === 422) return errors.badRequest({ error: 'validation_error', message: err.message });
    if (err && err.status === 409) return errors.conflict(err.message);
    throw err;
  }
}
