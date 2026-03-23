"use client"
import EntityTable from "../../components/EntityTable"
import Link from "next/link"

export default function Page() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/products/new" className="px-3 py-1 bg-blue-600 text-white rounded">New</Link>
      </div>
      <EntityTable endpoint="/api/products" columns={[{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }, { key: 'price', label: 'Price', type: 'amount' }]} title="Prepared Products" editHrefBase="/products" />
    </div>
  )
}
