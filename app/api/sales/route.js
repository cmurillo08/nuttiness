import { withClient, runTransaction } from '../../../lib/db';
import validators from '../../../lib/validators';
import errors from '../../../lib/errors';

function scaleToInt(n) {
  return Math.round(Number(n) * 10000);
}

function toFixed4FromScaled(scaled) {
  return (scaled / 10000).toFixed(4);
}

export async function GET() {
  return await withClient(async (client) => {
    const res = await client.query('SELECT * FROM sales ORDER BY created_at DESC LIMIT 100');
    return errors.json(res.rows, 200);
  });
}

export async function POST(req) {
  const body = await req.json();
  const valid = validators.Sale(body);
  if (!valid) return errors.badRequest(validators.Sale.errors);

  const items = body.items || [];
  for (const it of items) {
    const ok = validators.SaleItem(it);
    if (!ok) return errors.badRequest(validators.SaleItem.errors);
  }

  // compute and validate totals using integer math (4 decimal places)
  let sumScaled = 0;
  for (const it of items) {
    const qty = Number(it.quantity);
    const unit = Number(it.unit_price);
    const computedScaled = Math.round(qty * unit * 10000);
    const providedScaled = scaleToInt(it.line_total);
    if (computedScaled !== providedScaled) {
      return errors.badRequest({ message: 'line_total mismatch for an item', prepared_product_id: it.prepared_product_id });
    }
    sumScaled += computedScaled;
  }

  const providedTotalScaled = scaleToInt(body.total_amount);
  if (sumScaled !== providedTotalScaled) {
    return errors.badRequest({ message: 'total_amount does not equal sum of line_total' });
  }

  try {
    const result = await runTransaction(async (client) => {
      const saleCols = ['customer_name','status','total_amount','created_at','updated_at'];
      const saleVals = [body.customer_name || null, body.status, toFixed4FromScaled(providedTotalScaled), body.created_at || null, body.updated_at || null];
      const salePlace = saleCols.map((_,i)=>`$${i+1}`).join(',');
      const insertSaleQ = `INSERT INTO sales (${saleCols.join(',')}) VALUES (${salePlace}) RETURNING *`;
      const saleRes = await client.query(insertSaleQ, saleVals);
      const saleId = saleRes.rows[0].id;

      // insert items after verifying prepared_product exists
      for (const it of items) {
        const fk = await client.query('SELECT 1 FROM prepared_products WHERE id = $1', [it.prepared_product_id]);
        if (fk.rowCount === 0) {
          throw { status: 404, message: `prepared_product ${it.prepared_product_id} not found` };
        }
        const qty = Number(it.quantity);
        const unitPriceScaled = scaleToInt(it.unit_price);
        const lineScaled = scaleToInt(it.line_total);
        const cols = ['sale_id','prepared_product_id','quantity','unit_price','line_total','created_at','updated_at'];
        const vals = [saleId, it.prepared_product_id, qty, toFixed4FromScaled(unitPriceScaled), toFixed4FromScaled(lineScaled), it.created_at || null, it.updated_at || null];
        const placeholders = cols.map((_,i)=>`$${i+1}`).join(',');
        const q = `INSERT INTO sale_items (${cols.join(',')}) VALUES (${placeholders}) RETURNING *`;
        await client.query(q, vals);
      }

      // return created sale and items
      const saleQ = await client.query('SELECT * FROM sales WHERE id = $1', [saleId]);
      const itemsQ = await client.query('SELECT * FROM sale_items WHERE sale_id = $1 ORDER BY created_at', [saleId]);
      return { sale: saleQ.rows[0], items: itemsQ.rows };
    });

    return errors.json(result, 201);
  } catch (err) {
    if (err && err.status === 404) return errors.notFound(err.message);
    if (err && err.code === '23505') return errors.conflict();
    throw err;
  }
}
