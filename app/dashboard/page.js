import EntityTable from "../../components/EntityTable"

async function getCount(path) {
  try {
    const res = await fetch(path)
    if (!res.ok) return 0
    const body = await res.json()
    return Array.isArray(body) ? body.length : (body.count || 0)
  } catch (e) {
    return 0
  }
}

export default async function Page() {
  const productsCount = await getCount(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/products`)
  const rawCount = await getCount(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/raw-products`)
  const expensesCount = await getCount(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/expenses`)
  const salesCount = await getCount(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/sales`)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 border rounded">
          <div className="text-sm text-gray-500">Products</div>
          <div className="text-2xl font-semibold">{productsCount}</div>
        </div>
        <div className="p-4 border rounded">
          <div className="text-sm text-gray-500">Raw Products</div>
          <div className="text-2xl font-semibold">{rawCount}</div>
        </div>
        <div className="p-4 border rounded">
          <div className="text-sm text-gray-500">Expenses</div>
          <div className="text-2xl font-semibold">{expensesCount}</div>
        </div>
        <div className="p-4 border rounded">
          <div className="text-sm text-gray-500">Sales</div>
          <div className="text-2xl font-semibold">{salesCount}</div>
        </div>
      </div>
    </div>
  )
}
