import validators from '../../../../lib/validators';
import errors from '../../../../lib/errors';
import { toFiniteNumber } from '../../../../lib/db/numbers';
import { deleteExpenseById, getExpenseById } from '../../../../lib/db/queries/expenses';
import { updateExpense } from '../../../../lib/services/expenses';

function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function GET(req, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return errors.badRequest([{ message: 'Invalid id format' }]);

  const expense = await getExpenseById(id);
  if (!expense) return errors.notFound();
  return errors.json(expense, 200);
}

export async function PUT(req, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return errors.badRequest([{ message: 'Invalid id format' }]);
  const body = await req.json();

  // Prefer full update validator when available
  if (validators && typeof validators.UpdateExpense === 'function') {
    const valid = validators.UpdateExpense(body);
    if (!valid) return errors.badRequest(validators.formatErrors(validators.UpdateExpense.errors));
  }

  // coerce numbers where needed
  const quantity = toFiniteNumber(body.quantity);
  const costVal = toFiniteNumber(body.cost ?? body.unit_cost);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return errors.badRequest([{ message: 'quantity must be a positive number' }]);
  }
  if (!Number.isFinite(costVal) || costVal < 0) {
    return errors.badRequest([{ message: 'cost (or unit_cost) must be a non-negative number' }]);
  }

  try {
    const expense = await updateExpense(id, {
      raw_product_id: body.raw_product_id || null,
      quantity,
      cost: costVal,
      purchased_at: body.purchased_at,
      notes: body.notes || null,
    });
    return errors.json(expense, 200);
  } catch (err) {
    if (err && err.status === 404) {
      return errors.notFound(err.message === 'raw_product not found' ? err.message : undefined);
    }
    if (err.code === '23505') return errors.conflict();
    throw err;
  }
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return errors.badRequest([{ message: 'Invalid id format' }]);

  const expense = await deleteExpenseById(id);
  if (!expense) return errors.notFound();
  return errors.json({}, 204);
}
