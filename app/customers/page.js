"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import EntityTable from "../../components/EntityTable"

export default function Page() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState("")
  const [limit, setLimit] = useState(10)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    let mounted = true
    async function fetchPage() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/customers?limit=${limit}&offset=${offset}`, { cache: 'no-store' })
        if (!res.ok) {
          const txt = await res.text()
          throw new Error(txt || `Error ${res.status}`)
        }
        const data = await res.json()
        const customersList = Array.isArray(data) ? data : (data?.customers || [])
        if (mounted) setItems(customersList)
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
          <h1 className="text-2xl font-semibold text-primary">Customers</h1>
        </div>
        <Link href="/customers/new" className="px-3 py-2 bg-primary text-white rounded-md">New</Link>
      </div>

      <div className="mb-4 flex gap-2 items-center flex-wrap">
        <input placeholder="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} className="p-2 border rounded w-full max-w-sm" />
        <select value={limit} onChange={(e) => { setLimit(parseInt(e.target.value)); setOffset(0) }} className="px-2 py-2 border rounded">
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={25}>25</option>
        </select>
      </div>

      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">{error}</div>}

      <div className="bg-white rounded shadow p-4">
        <EntityTable 
          items={filtered} 
          columns={[
            { key: "name", label: "Name" },
            { key: "phone", label: "Phone" },
            { key: "notes", label: "Notes" },
          ]}
          editHrefBase="/customers"
          entityName="Customer"
        />
      </div>

      <div className="flex items-center gap-2 mt-4">
        <button className="px-3 py-1 border rounded" onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0}>Prev</button>
        <div className="text-sm">Offset: {offset}</div>
        <button className="px-3 py-1 border rounded" onClick={() => setOffset(offset + limit)}>Next</button>
      </div>
    </div>
  )
}
