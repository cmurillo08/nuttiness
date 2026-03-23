"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import EntityTable from "../../components/EntityTable"

export default function Page() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [limit, setLimit] = useState(10)
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState("")

  useEffect(() => {
    let mounted = true
    async function fetchPage() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/raw-products?limit=${limit}&offset=${offset}`)
        if (!res.ok) {
          const txt = await res.text()
          throw new Error(txt || `Error ${res.status}`)
        }
        const data = await res.json()
        if (mounted) setItems(Array.isArray(data) ? data : [])
      } catch (e) {
        if (mounted) setError(String(e))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchPage()
    return () => { mounted = false }
  }, [limit, offset])

  const filtered = items.filter((it) => it.name && it.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Raw Products</h1>
        <Link href="/raw-products/new" className="px-3 py-1 bg-blue-600 text-white rounded">New</Link>
      </div>

      <div className="mb-4 flex gap-2">
        <input placeholder="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} className="p-2 border rounded" />
        <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setOffset(0) }} className="p-2 border rounded">
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={25}>25</option>
        </select>
      </div>

      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">{error}</div>}

      <EntityTable endpoint={`/api/raw-products?limit=${limit}&offset=${offset}`} items={filtered} columns={[
        { key: "name", label: "Name" },
        { key: "unit", label: "Unit" },
        { key: "price", label: "Price", type: "amount" },
        { key: "supplier", label: "Supplier" },
      ]} editHrefBase="/raw-products" />

      <div className="flex items-center gap-2 mt-4">
        <button className="px-3 py-1 border rounded" onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0}>Prev</button>
        <div className="text-sm">Offset: {offset}</div>
        <button className="px-3 py-1 border rounded" onClick={() => setOffset(offset + limit)}>Next</button>
      </div>
    </div>
  )
}
