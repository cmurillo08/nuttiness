import validators from '../../../lib/validators';
import errors from '../../../lib/errors';
import pagination from '../../../lib/pagination';
import sorting, { NAME_SORT_OPTIONS } from '../../../lib/sorting';
import { toFiniteNumber } from '../../../lib/db/numbers';
import { countPreparedProducts, createPreparedProduct, listPreparedProducts } from '../../../lib/db/queries/products';

const SORT_OPTIONS = NAME_SORT_OPTIONS;

export async function GET(req) {
  const url = new URL(req.url);
  const { limit, offset, errors: paginationErrors } = pagination.parsePaginationParams(url);

  if (paginationErrors) {
    return errors.badRequest(paginationErrors);
  }

  const { sort, order, errors: sortErrors } = sorting.parseSortParams(url, SORT_OPTIONS);
  if (sortErrors) {
    return errors.badRequest(sortErrors);
  }

  const rows = await listPreparedProducts({ limit, offset, sort, order });
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
