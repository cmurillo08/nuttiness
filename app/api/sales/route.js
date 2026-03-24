import { withClient, runTransaction } from '../../../lib/db';
import validators from '../../../lib/validators';
import errors from '../../../lib/errors';

function roundTwo(n) {
  return Number(Number(n).toFixed(2));
}

export async function GET(req) {
  const url = new URL(req.url);
  const rawLimit = parseInt(url.searchParams.get('limit') || '100', 10) || 100;
  const limit = Math.min(rawLimit, 1000);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10) || 0;
  const status = url.searchParams.get('status');

  return await withClient(async (client) => {
    const params = [limit, offset];
    let where = '';
    if (status) {
      where = 'WHERE s.status = $3';
      params.push(status);
    }
    const q = `SELECT s.id, s.customer_id, c.name as customer_name, s.status, s.total_amount, s.created_at, s.updated_at FROM sales s LEFT JOIN customers c ON s.customer_id = c.id ${where} ORDER BY s.created_at DESC LIMIT $1 OFFSET $2`;
    const res = await client.query(q, params);
    const totalQ = status ? await client.query('SELECT COUNT(*) FROM sales WHERE status = $1', [status]) : await client.query('SELECT COUNT(*) FROM sales');
    const total = Number(totalQ.rows[0].count || 0);
    return errors.json({ data: res.rows, limit, offset, total }, 200);
  });
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

  // validate each line and compute totals server-side
  const computedLines = [];
  for (let i = 0; i < payload.lines.length; i++) {
    const l = payload.lines[i];
    if (!validators.SaleItemCreate(l)) {
      return errors.badRequest(validators.formatErrors(validators.SaleItemCreate.errors));
    }
    const quantity = Number(l.quantity);
    const unit_price = Number(l.unit_price);
    if (!(quantity > 0)) {
      return errors.badRequest({ error: 'validation_error', details: [{ field: `lines[${i}].quantity`, message: 'quantity must be > 0' }] });
    }
    if (!(unit_price >= 0)) {
      return errors.badRequest({ error: 'validation_error', details: [{ field: `lines[${i}].unit_price`, message: 'unit_price must be >= 0' }] });
    }
    const line_total = roundTwo(quantity * unit_price);
    computedLines.push({ ...l, quantity, unit_price, line_total });
  }

  const total_amount = computedLines.reduce((s, ln) => s + ln.line_total, 0);

  try {
    const result = await runTransaction(async (client) => {
      // Verify customer exists
      const customerCheck = await client.query('SELECT 1 FROM customers WHERE id = $1', [payload.customer_id]);
      if (customerCheck.rowCount === 0) {
        throw { status: 422, message: `customer ${payload.customer_id} not found` };
      }

      const insertSaleQ = `INSERT INTO sales (customer_id, status, total_amount) VALUES ($1,$2,$3) RETURNING *`;
      const saleRes = await client.query(insertSaleQ, [payload.customer_id, payload.status, total_amount]);
      const saleId = saleRes.rows[0].id;

      for (const ln of computedLines) {
        if (ln.prepared_product_id) {
          const fk = await client.query('SELECT 1 FROM prepared_products WHERE id = $1', [ln.prepared_product_id]);
          if (fk.rowCount === 0) {
            throw { status: 422, message: `prepared_product ${ln.prepared_product_id} not found` };
          }
        }
        await client.query(
          `INSERT INTO sale_items (sale_id, prepared_product_id, quantity, unit_price, line_total) VALUES ($1,$2,$3,$4,$5)`,
          [saleId, ln.prepared_product_id || null, ln.quantity, roundTwo(ln.unit_price), roundTwo(ln.line_total)]
        );
      }

      const saleQ = await client.query('SELECT s.id, s.customer_id, c.name as customer_name, s.status, s.total_amount, s.created_at, s.updated_at FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.id = $1', [saleId]);
      const linesQ = await client.query(`
        SELECT 
          si.id, 
          si.prepared_product_id, 
          pp.name as product_name,
          si.quantity, 
          si.unit_price, 
          si.line_total 
        FROM sale_items si
        LEFT JOIN prepared_products pp ON si.prepared_product_id = pp.id
        WHERE si.sale_id = $1 
        ORDER BY si.created_at
      `, [saleId]);
      return { ...saleQ.rows[0], lines: linesQ.rows };
    });

    return errors.json(result, 201);
  } catch (err) {
    if (err && err.status === 422) return errors.badRequest({ error: 'validation_error', message: err.message });
    if (err && err.code === '23505') return errors.conflict();
    throw err;
  }
}
