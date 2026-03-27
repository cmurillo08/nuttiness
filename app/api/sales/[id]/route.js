import errors from '../../../../lib/errors';
import { getSaleDetailById } from '../../../../lib/db/queries/sales';

export async function GET(req, { params }) {
  const { id } = await params;

  const sale = await getSaleDetailById(id, null, { includeUnit: true });
  if (!sale) return errors.notFound('sale not found');
  return errors.json(sale, 200);
}
