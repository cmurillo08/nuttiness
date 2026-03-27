import { runTransaction } from '../db.js';
import { normalizeMoney, sumMoney, toFiniteNumber } from '../db/numbers.js';
import {
  countSaleLines,
  createSaleRecord,
  customerExists,
  deleteSaleItemById,
  getSaleDetailById,
  getSaleItemById,
  getSaleItemDetailById,
  getSaleStatusRow,
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

    if (!(quantity > 0)) {
      throw validationError(`lines[${index}].quantity`, 'quantity must be > 0');
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

    await updateSaleStatus(id, toStatus, client);
    return getSaleDetailById(id, client);
  });
}

export async function updateSaleItem(saleId, itemId, input) {
  const quantity = toFiniteNumber(input.quantity);
  const unitPrice = toFiniteNumber(input.unit_price);

  if (!(quantity > 0)) {
    throw validationError('quantity', 'quantity must be > 0');
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
