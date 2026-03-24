import { query } from '../../../lib/db'

export async function GET() {
  try {
    const productCount = await query('SELECT COUNT(*) as count FROM prepared_products')
    const rawProductCount = await query('SELECT COUNT(*) as count FROM raw_products')
    const expenseCount = await query('SELECT COUNT(*) as count FROM expenses')
    const salesCount = await query('SELECT COUNT(*) as count FROM sales')
    const customerCount = await query('SELECT COUNT(*) as count FROM customers')

    console.log('Product count result:', productCount.rows)
    console.log('Raw product count result:', rawProductCount.rows)

    return Response.json({
      products: productCount.rows[0]?.count ? parseInt(productCount.rows[0].count) : 0,
      rawProducts: rawProductCount.rows[0]?.count ? parseInt(rawProductCount.rows[0].count) : 0,
      expenses: expenseCount.rows[0]?.count ? parseInt(expenseCount.rows[0].count) : 0,
      sales: salesCount.rows[0]?.count ? parseInt(salesCount.rows[0].count) : 0,
      customers: customerCount.rows[0]?.count ? parseInt(customerCount.rows[0].count) : 0,
    })
  } catch (err) {
    console.error('Stats error:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
