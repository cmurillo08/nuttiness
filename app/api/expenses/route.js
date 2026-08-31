import validators from '../../../lib/validators';
import errors from '../../../lib/errors';
import pagination from '../../../lib/pagination';
import sorting from '../../../lib/sorting';
import dateRange from '../../../lib/dateRange';
import { normalizePurchasedAt } from '../../../lib/date';
import { toFiniteNumber } from '../../../lib/db/numbers';
import { countExpenses, createExpense, listExpenses } from '../../../lib/db/queries/expenses';

const SORT_OPTIONS = {
  allowed: ['purchased_at', 'raw_product_name'],
  defaultSort: 'purchased_at',
  defaultOrder: 'desc',
  columnDefaults: { purchased_at: 'desc', raw_product_name: 'asc' },
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

  const rows = await listExpenses({ limit, offset, rangeDays, sort, order });
  const total = await countExpenses({ rangeDays });
  return errors.json(pagination.buildPaginationResponse(rows, total, limit, offset), 200);
}

export async function POST(req) {
  const rawBody = await req.json();
  const { body, error: dateError } = normalizePurchasedAt(rawBody);
  if (dateError) return errors.badRequest([{ message: dateError }]);

  // Prefer schema validator if available
  if (validators && typeof validators.CreateExpense === 'function') {
    const ok = validators.CreateExpense(body);
    if (!ok) return errors.badRequest(validators.formatErrors(validators.CreateExpense.errors));
  }

  // runtime fallback validation
  const quantity = toFiniteNumber(body.quantity);
  const costVal = toFiniteNumber(body.cost ?? body.unit_cost);
  if (!Number.isInteger(quantity) || quantity < 1) return errors.badRequest([{ message: 'quantity must be a positive whole number' }]);
  if (!Number.isFinite(costVal) || costVal < 0) return errors.badRequest([{ message: 'cost must be a non-negative number' }]);

  try {
    const expense = await createExpense({
      raw_product_id: body.raw_product_id || null,
      quantity,
      cost: costVal,
      purchased_at: body.purchased_at,
      notes: body.notes || null,
    });
    return errors.json(expense, 201);
  } catch (err) {
    if (err.code === '23505') return errors.conflict();
    throw err;
  }
}
