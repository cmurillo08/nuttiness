import { runTransaction } from '../db.js';
import { rawProductExists, updateExpenseById } from '../db/queries/expenses.js';

export async function updateExpense(id, data) {
  return runTransaction(async (client) => {
    if (data.raw_product_id) {
      const hasRawProduct = await rawProductExists(data.raw_product_id, client);
      if (!hasRawProduct) {
        throw { status: 404, message: 'raw_product not found' };
      }
    }

    const expense = await updateExpenseById(id, data, client);
    if (!expense) {
      throw { status: 404, message: 'expense not found' };
    }

    return expense;
  });
}
