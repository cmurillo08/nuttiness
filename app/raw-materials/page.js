"use client"
import EntityTable from "../../components/EntityTable"
import Link from "next/link"

export default function Page() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Raw Materials</h1>
        <Link href="/raw-materials/new" className="px-3 py-1 bg-blue-600 text-white rounded">New</Link>
      </div>
      <EntityTable endpoint="/api/raw-products" columns={[{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }, { key: 'unit', label: 'Unit' }, { key: 'price', label: 'Price', type: 'amount' }]} title="Raw Products" editHrefBase="/raw-materials" />
    </div>
  )
}
