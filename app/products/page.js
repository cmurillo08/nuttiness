"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import EntityTable from "../../components/EntityTable"
import Pagination from "../../components/Pagination"

export default function Page() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [limit, setLimit] = useState(25)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")

  useEffect(() => {
    let mounted = true
    async function fetchPage() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/products?limit=${limit}&offset=${offset}`)
        if (!res.ok) {
          const txt = await res.text()
          throw new Error(txt || `Error ${res.status}`)
        }
        const data = await res.json()
        if (mounted) {
          // Handle both wrapped {items, total, limit, offset} and direct array responses
          if (Array.isArray(data)) {
            setItems(data)
            setTotal(data.length)
          } else if (data && typeof data === 'object') {
            setItems(Array.isArray(data.items) ? data.items : [])
            setTotal(typeof data.total === 'number' ? data.total : 0)
          } else {
            setItems([])
            setTotal(0)
          }
        }
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
        <div className="flex items-center gap-3">
          <Link href="/dashboard" title="Back to Dashboard" className="hover:opacity-80 transition-opacity">
            <img src="/nuttiness-logo.png" alt="Dashboard" className="h-12 w-12 object-contain" />
          </Link>
          <h1 className="text-2xl font-semibold text-primary">Products</h1>
        </div>
        <Link href="/products/new" className="px-3 py-2 bg-primary text-white rounded-md">New</Link>
      </div>

      <div className="mb-4 flex gap-2 items-center flex-wrap">
        <input placeholder="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} className="p-2 border rounded w-full max-w-sm" />
      </div>

      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">{error}</div>}

      <div style={{ overflow: 'hidden' }}>
        <EntityTable items={filtered} columns={[
            { key: "name", label: "Name" },
            { key: "unit", label: "Unit" },
            { key: "price", label: "Price", type: "amount" },
          ]} editHrefBase="/products" entityName="Product" />
      </div>

      <Pagination
        total={total}
        limit={limit}
        offset={offset}
        onLimitChange={(newLimit) => {
          setLimit(newLimit)
          setOffset(0)
        }}
        onOffsetChange={setOffset}
      />
    </div>
  )
}
