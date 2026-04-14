import validators from '../../../../lib/validators';
import errors from '../../../../lib/errors';
import { deleteCustomerById, getCustomerById, updateCustomerById } from '../../../../lib/db/queries/customers';

function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function GET(req, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return errors.badRequest([{ message: 'Invalid id format' }]);

  const customer = await getCustomerById(id);
  if (!customer) return errors.notFound('Customer not found');
  return errors.json(customer, 200);
}

export async function PUT(req, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return errors.badRequest([{ message: 'Invalid id format' }]);

  const body = await req.json();
  const valid = validators.UpdateCustomer(body);
  if (!valid) return errors.badRequest(validators.formatErrors(validators.UpdateCustomer.errors));

  try {
    const customer = await updateCustomerById(id, body);
    if (!customer) return errors.notFound('Customer not found');
    return errors.json(customer, 200);
  } catch (err) {
    if (err.code === '23505') return errors.conflict('Customer name already exists');
    throw err;
  }
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return errors.badRequest([{ message: 'Invalid id format' }]);

  const customer = await deleteCustomerById(id);
  if (!customer) return errors.notFound('Customer not found');
  return errors.json({}, 204);
}
