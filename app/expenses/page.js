"use client"
import EntityTable from "../../components/EntityTable"
import Link from "next/link"

export default function Page() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <Link href="/expenses/new" className="px-3 py-1 bg-blue-600 text-white rounded">New</Link>
      </div>
      <EntityTable endpoint="/api/expenses" columns={[{ key: 'id', label: 'ID' }, { key: 'description', label: 'Description' }, { key: 'amount', label: 'Amount', type: 'amount' }]} title="Expenses" editHrefBase="/expenses" />
    </div>
  )
}
