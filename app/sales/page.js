"use client"
import Link from "next/link"

export default function Page() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Sales</h1>
        <Link href="/sales/new" className="px-3 py-1 bg-blue-600 text-white rounded">New Order</Link>
      </div>
      <div className="text-sm text-gray-500">Sales list is provided by the backend. Use the list API or build paginated view as needed.</div>
    </div>
  )
}
