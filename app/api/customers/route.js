import validators from '../../../lib/validators';
import errors from '../../../lib/errors';
import pagination from '../../../lib/pagination';
import { countCustomers, createCustomer, listCustomers } from '../../../lib/db/queries/customers';

export async function GET(req) {
  const url = new URL(req.url);
  const { limit, offset, errors: paginationErrors } = pagination.parsePaginationParams(url);
  
  if (paginationErrors) {
    return errors.badRequest(paginationErrors);
  }

  const rows = await listCustomers({ limit, offset });
  const total = await countCustomers();
  return errors.json(pagination.buildPaginationResponse(rows, total, limit, offset), 200);
}

export async function POST(req) {
  const body = await req.json();
  const valid = validators.CreateCustomer(body);
  if (!valid) return errors.badRequest(validators.formatErrors(validators.CreateCustomer.errors));

  try {
    const customer = await createCustomer(body);
    return errors.json(customer, 201);
  } catch (err) {
    if (err.code === '23505') return errors.conflict('Customer name already exists');
    throw err;
  }
}
