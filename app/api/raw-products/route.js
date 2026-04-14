import validators from '../../../lib/validators';
import errors from '../../../lib/errors';
import pagination from '../../../lib/pagination';
import { toFiniteNumber } from '../../../lib/db/numbers';
import { countRawProducts, createRawProduct, listRawProducts } from '../../../lib/db/queries/rawProducts';

export async function GET(req) {
  const url = new URL(req.url);
  const { limit, offset, errors: paginationErrors } = pagination.parsePaginationParams(url);
  
  if (paginationErrors) {
    return errors.badRequest(paginationErrors);
  }

  const rows = await listRawProducts({ limit, offset });
  const total = await countRawProducts();
  return errors.json(pagination.buildPaginationResponse(rows, total, limit, offset), 200);
}

export async function POST(req) {
  const body = await req.json();
  const valid = validators.CreateRawProduct(body);
  if (!valid) return errors.badRequest(validators.formatErrors(validators.CreateRawProduct.errors));

  try {
    const rawProduct = await createRawProduct({
      ...body,
      price: toFiniteNumber(body.price),
    });
    return errors.json(rawProduct, 201);
  } catch (err) {
    if (err.code === '23505') return errors.conflict();
    throw err;
  }
}
