import { runTransaction } from '../db.js';
import { normalizeMoney, sumMoney, toCents, toFiniteNumber } from '../db/numbers.js';
import {
  countSaleLines,
  createSaleRecord,
  customerExists,
  deleteSaleById,
  deleteSaleCreditById,
  deleteSaleItemById,
  getSaleCreditById,
  getSaleCreditsSummary,
  getSaleDetailById,
  getSaleHeaderById,
  getSaleItemById,
  getSaleItemDetailById,
  getSaleStatusRow,
  insertSaleCredit,
  insertSaleItem,
  preparedProductExists,
  recalculateSaleTotal,
  updateSaleItemById,
  updateSaleStatus,
} from '../db/queries/sales.js';

function validationError(field, message) {
  return {
    status: 400,
    payload: {
      error: 'validation_error',
      details: [{ field, message }],
    },
  };
}

function normalizeSaleLines(lines) {
  const normalizedLines = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const quantity = toFiniteNumber(line.quantity);
    const unitPrice = toFiniteNumber(line.unit_price);

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw validationError(`lines[${index}].quantity`, 'quantity must be a positive whole number');
    }

    if (!(unitPrice >= 0)) {
      throw validationError(`lines[${index}].unit_price`, 'unit_price must be >= 0');
    }

    normalizedLines.push({
      prepared_product_id: line.prepared_product_id ?? null,
      quantity,
      unit_price: normalizeMoney(unitPrice),
      line_total: normalizeMoney(quantity * unitPrice),
    });
  }

  return normalizedLines;
}

function assertSaleMutable(status, action) {
  if (status === 'delivered' || status === 'paid' || status === 'cancelled') {
    throw { status: 403, message: `cannot ${action} a ${status} sale` };
  }
}

function assertCreditsMutable(status) {
  if (status === 'paid') {
    throw { status: 409, message: 'cannot modify credits on a paid sale' };
  }
}

export async function createSale(payload) {
  const lines = normalizeSaleLines(payload.lines);
  const totalAmount = sumMoney(lines.map((line) => line.line_total));

  return runTransaction(async (client) => {
    const hasCustomer = await customerExists(payload.customer_id, client);
    if (!hasCustomer) {
      throw { status: 422, message: `customer ${payload.customer_id} not found` };
    }

    const sale = await createSaleRecord({
      customer_id: payload.customer_id,
      status: payload.status,
      total_amount: totalAmount,
    }, client);

    for (const line of lines) {
      if (line.prepared_product_id) {
        const hasProduct = await preparedProductExists(line.prepared_product_id, client);
        if (!hasProduct) {
          throw { status: 422, message: `prepared_product ${line.prepared_product_id} not found` };
        }
      }

      await insertSaleItem({ sale_id: sale.id, ...line }, client);
    }

    return getSaleDetailById(sale.id, client);
  });
}

export async function cancelSale(id) {
  return runTransaction(async (client) => {
    const currentSale = await getSaleStatusRow(id, client, { forUpdate: true });
    if (!currentSale) {
      throw { status: 404, message: 'sale not found' };
    }

    const fromStatus = currentSale.status;
    if (fromStatus === 'paid') {
      throw { status: 400, message: 'cannot cancel a paid sale' };
    }
    if (!(fromStatus === 'prepared' || fromStatus === 'delivered')) {
      throw { status: 400, message: 'can only cancel prepared or delivered' };
    }

    await updateSaleStatus(id, 'cancelled', client);
    return getSaleDetailById(id, client);
  });
}

export async function deleteSale(id) {
  return runTransaction(async (client) => {
    const currentSale = await getSaleStatusRow(id, client, { forUpdate: true });
    if (!currentSale) {
      throw { status: 404, message: 'sale not found' };
    }

    // Deletable regardless of status (manual-testing convenience) — the
    // frontend warns before calling this, and sale_credits cascade-deletes
    // with the sale via the FK, so no orphaned credit rows are left behind.
    await deleteSaleById(id, client);
    return { success: true };
  });
}

export async function transitionSale(id, toStatus) {
  return runTransaction(async (client) => {
    const currentSale = await getSaleStatusRow(id, client, { forUpdate: true });
    if (!currentSale) {
      throw { status: 404, message: 'sale not found' };
    }

    const fromStatus = currentSale.status;
    if (fromStatus === 'paid') {
      throw { status: 403, message: 'cannot transition from paid' };
    }

    if (toStatus === 'delivered' && fromStatus !== 'prepared') {
      throw { status: 400, message: 'prepared -> delivered only' };
    }
    if (toStatus === 'paid' && fromStatus !== 'delivered') {
      throw { status: 400, message: 'delivered -> paid only' };
    }
    if (toStatus === 'cancelled' && !(fromStatus === 'prepared' || fromStatus === 'delivered')) {
      throw { status: 400, message: 'can only cancel prepared or delivered' };
    }

    if (toStatus === 'delivered' || toStatus === 'paid') {
      const lineCount = await countSaleLines(id, client);
      if (lineCount < 1) {
        throw { status: 422, message: 'sale must have at least one line to transition to delivered/paid' };
      }
    }

    // R4 — paid gate: a credited sale may only become paid once its balance reaches zero.
    if (toStatus === 'paid') {
      const { amount_paid, credit_count } = await getSaleCreditsSummary(id, client);
      if (credit_count > 0) {
        const { total_amount } = await getSaleHeaderById(id, client);
        const balance = toCents(total_amount) - toCents(amount_paid);
        if (balance > 0) {
          const balanceDue = normalizeMoney(balance / 100);
          throw {
            status: 409,
            message: `cannot mark this sale paid; ${balanceDue} is still outstanding across ${credit_count} recorded credit(s)`,
          };
        }
      }
    }

    // §2.3 — a credited sale cannot move back to a status where credits are not permitted.
    // The route's `allowed` set (app/api/sales/[id]/transition/route.js) never sends
    // to_status: 'ordered' today, so only the 'prepared' branch is currently reachable;
    // the 'ordered' check is kept so this guard doesn't silently stop covering it if
    // that transition is ever exposed again.
    if (toStatus === 'ordered' || toStatus === 'prepared') {
      const { credit_count } = await getSaleCreditsSummary(id, client);
      if (credit_count > 0) {
        throw {
          status: 409,
          message: `cannot move this sale back to ${toStatus}; it has ${credit_count} recorded credit(s). Delete them first.`,
        };
      }
    }

    await updateSaleStatus(id, toStatus, client);
    return getSaleDetailById(id, client);
  });
}

export async function addSaleCredit(saleId, input) {
  const amount = toFiniteNumber(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw validationError('amount', 'amount must be greater than 0');
  }
  if (normalizeMoney(amount) !== amount) {
    throw validationError('amount', 'amount cannot have more than 2 decimals');
  }

  let notes = input.notes;
  if (typeof notes === 'string') {
    notes = notes.trim();
    if (notes === '') notes = null;
  } else if (notes === undefined) {
    notes = null;
  }
  if (notes !== null && notes !== undefined && notes.length > 5000) {
    throw validationError('notes', 'notes must be 5000 characters or fewer');
  }

  return runTransaction(async (client) => {
    const currentSale = await getSaleStatusRow(saleId, client, { forUpdate: true });
    if (!currentSale) {
      throw { status: 404, message: 'sale not found' };
    }

    const { status } = currentSale;
    if (status !== 'delivered') {
      throw {
        status: 409,
        message: `cannot record a credit on a ${status} sale; credits can only be recorded while a sale is delivered`,
      };
    }

    const [{ total_amount }, { amount_paid }] = await Promise.all([
      getSaleHeaderById(saleId, client),
      getSaleCreditsSummary(saleId, client),
    ]);

    if (toCents(amount_paid) + toCents(amount) > toCents(total_amount)) {
      const balanceDue = normalizeMoney(total_amount - amount_paid);
      throw {
        status: 409,
        message: `credit of ${amount} exceeds the remaining balance of ${balanceDue}`,
      };
    }

    await insertSaleCredit({ sale_id: saleId, amount: normalizeMoney(amount), notes }, client);

    return getSaleDetailById(saleId, client);
  });
}

export async function deleteSaleCredit(saleId, creditId) {
  return runTransaction(async (client) => {
    const currentSale = await getSaleStatusRow(saleId, client, { forUpdate: true });
    if (!currentSale) {
      throw { status: 404, message: 'sale not found' };
    }

    assertCreditsMutable(currentSale.status);

    const credit = await getSaleCreditById(saleId, creditId, client);
    if (!credit) {
      throw { status: 404, message: 'sale credit not found' };
    }

    await deleteSaleCreditById(creditId, client);

    return getSaleDetailById(saleId, client);
  });
}

export async function updateSaleItem(saleId, itemId, input) {
  const quantity = toFiniteNumber(input.quantity);
  const unitPrice = toFiniteNumber(input.unit_price);

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw validationError('quantity', 'quantity must be a positive whole number');
  }
  if (!(unitPrice >= 0)) {
    throw validationError('unit_price', 'unit_price must be >= 0');
  }

  return runTransaction(async (client) => {
    const sale = await getSaleStatusRow(saleId, client);
    if (!sale) {
      throw { status: 404, message: 'sale not found' };
    }
    assertSaleMutable(sale.status, 'edit items on');

    const item = await getSaleItemById(saleId, itemId, client);
    if (!item) {
      throw { status: 404, message: 'sale item not found' };
    }

    await updateSaleItemById(itemId, {
      quantity,
      unit_price: normalizeMoney(unitPrice),
      line_total: normalizeMoney(quantity * unitPrice),
    }, client);

    await recalculateSaleTotal(saleId, client);
    return getSaleItemDetailById(itemId, client);
  });
}

export async function deleteSaleItem(saleId, itemId) {
  return runTransaction(async (client) => {
    const sale = await getSaleStatusRow(saleId, client);
    if (!sale) {
      throw { status: 404, message: 'sale not found' };
    }
    assertSaleMutable(sale.status, 'delete items from');

    const item = await getSaleItemById(saleId, itemId, client);
    if (!item) {
      throw { status: 404, message: 'sale item not found' };
    }

    await deleteSaleItemById(itemId, client);
    await recalculateSaleTotal(saleId, client);

    return { success: true };
  });
}
