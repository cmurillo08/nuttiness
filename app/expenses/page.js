"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import EntityTable from "../../components/EntityTable"
import RawProductSelect from "../../components/RawProductSelect"

export default function ExpensesPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterRawProduct, setFilterRawProduct] = useState(null)

  useEffect(() => {
    let mounted = true
    async function fetchItems() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/expenses")
        if (!res.ok) throw new Error(`Failed to load expenses: ${res.status}`)
        let data = await res.json()
        if (!Array.isArray(data)) data = []
        const mapped = data.map((it) => ({ ...it, raw_product_name: it.raw_product?.name ?? it.raw_product_name ?? "" }))
        if (mounted) setItems(mapped)
      } catch (err) {
        if (mounted) setError(String(err))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchItems()
    return () => { mounted = false }
  }, [])

  const columns = [
    { key: "purchased_at", label: "Purchased At" },
    { key: "raw_product_name", label: "Raw product" },
    { key: "quantity", label: "Quantity" },
    { key: "cost", label: "Cost", type: "amount" },
    { key: "notes", label: "Notes" },
  ]

  const filtered = items.filter((it) => {
    if (filterRawProduct && String(filterRawProduct) !== String(it.raw_product_id)) return false
    return true
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-primary">Expenses</h1>
        <Link href="/expenses/new" className="px-3 py-2 bg-primary text-white rounded-md">New Expense</Link>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 max-w-md">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Filter by raw product</label>
          <RawProductSelect value={filterRawProduct} onChange={setFilterRawProduct} placeholder="All raw products" />
        </div>
      </div>

      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">{error}</div>}

      <div className="bg-white rounded shadow p-4">
        <EntityTable items={filtered} columns={columns} title="Expenses" editHrefBase="/expenses" />
      </div>
    </div>
  )
}
