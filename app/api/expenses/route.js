import validators from '../../../lib/validators';
import errors from '../../../lib/errors';
import pagination from '../../../lib/pagination';
import { toFiniteNumber } from '../../../lib/db/numbers';
import { countExpenses, createExpense, listExpenses } from '../../../lib/db/queries/expenses';

export async function GET(req) {
  const url = new URL(req.url);
  const { limit, offset, errors: paginationErrors } = pagination.parsePaginationParams(url);
  
  if (paginationErrors) {
    return errors.badRequest(paginationErrors);
  }

  const rows = await listExpenses({ limit, offset });
  const total = await countExpenses();
  return errors.json(pagination.buildPaginationResponse(rows, total, limit, offset), 200);
}

export async function POST(req) {
  const body = await req.json();
  // Prefer schema validator if available
  if (validators && typeof validators.CreateExpense === 'function') {
    const ok = validators.CreateExpense(body);
    if (!ok) return errors.badRequest(validators.formatErrors(validators.CreateExpense.errors));
  }

  // runtime fallback validation
  const quantity = toFiniteNumber(body.quantity);
  const costVal = toFiniteNumber(body.cost ?? body.unit_cost);
  if (!Number.isFinite(quantity) || quantity <= 0) return errors.badRequest([{ message: 'quantity must be a positive number' }]);
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
