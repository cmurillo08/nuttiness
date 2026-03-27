import validators from '../../../lib/validators';
import errors from '../../../lib/errors';
import pagination from '../../../lib/pagination';
import { toFiniteNumber } from '../../../lib/db/numbers';
import { countPreparedProducts, createPreparedProduct, listPreparedProducts } from '../../../lib/db/queries/products';

export async function GET(req) {
  const url = new URL(req.url);
  const { limit, offset, errors: paginationErrors } = pagination.parsePaginationParams(url);
  
  if (paginationErrors) {
    return errors.badRequest(paginationErrors);
  }

  const rows = await listPreparedProducts({ limit, offset });
  const total = await countPreparedProducts();
  return errors.json(pagination.buildPaginationResponse(rows, total, limit, offset), 200);
}

export async function POST(req) {
  const body = await req.json();
  const valid = validators.CreatePreparedProduct(body);
  if (!valid) return errors.badRequest(validators.formatErrors(validators.CreatePreparedProduct.errors));

  try {
    const product = await createPreparedProduct({
      ...body,
      price: toFiniteNumber(body.price),
    });
    return errors.json(product, 201);
  } catch (err) {
    if (err.code === '23505') return errors.conflict();
    throw err;
  }
}
