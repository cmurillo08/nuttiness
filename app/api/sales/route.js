import validators from '../../../lib/validators';
import errors from '../../../lib/errors';
import pagination from '../../../lib/pagination';
import sorting from '../../../lib/sorting';
import dateRange from '../../../lib/dateRange';
import { countSales, listSales } from '../../../lib/db/queries/sales';
import { createSale } from '../../../lib/services/sales';

const SORT_OPTIONS = {
  allowed: ['created_at', 'customer_name'],
  defaultSort: 'created_at',
  defaultOrder: 'desc',
  columnDefaults: { created_at: 'desc', customer_name: 'asc' },
};

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

  const { rangeDays, errors: rangeErrors } = dateRange.parseDateRangeParam(url);
  if (rangeErrors) {
    return errors.badRequest(rangeErrors);
  }

  const status = url.searchParams.get('status');

  const rows = await listSales({ limit, offset, status, rangeDays, sort, order });
  const total = await countSales({ status, rangeDays });
  return errors.json(pagination.buildPaginationResponse(rows, total, limit, offset), 200);
}

export async function POST(req) {
  const body = await req.json();

  const payload = {
    customer_id: body.customer_id,
    status: body.status || 'prepared',
    lines: Array.isArray(body.lines) ? body.lines : []
  };

  // basic AJV validation if schema exists
  if (!validators.SaleCreate(payload)) {
    return errors.badRequest(validators.formatErrors(validators.SaleCreate.errors));
  }

  // ensure at least one line
  if (!payload.lines || payload.lines.length === 0) {
    return errors.badRequest({ error: 'validation_error', details: [{ field: 'lines', message: 'at least one line is required' }] });
  }

  for (let i = 0; i < payload.lines.length; i++) {
    const l = payload.lines[i];
    if (!validators.SaleItemCreate(l)) {
      return errors.badRequest(validators.formatErrors(validators.SaleItemCreate.errors));
    }
  }

  try {
    const result = await createSale(payload);
    return errors.json(result, 201);
  } catch (err) {
    if (err && err.status === 400 && err.payload) return errors.badRequest(err.payload);
    if (err && err.status === 422) return errors.badRequest({ error: 'validation_error', message: err.message });
    if (err && err.code === '23505') return errors.conflict();
    throw err;
  }
}
