"use client"
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import EntityTable from "../../components/EntityTable"
import Pagination from "../../components/Pagination"

export default function Page() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState("")
  const [limit, setLimit] = useState(25)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)

  const fetchPage = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/customers?limit=${limit}&offset=${offset}`, { cache: 'no-store' })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || `Error ${res.status}`)
      }
      const data = await res.json()
      if (Array.isArray(data)) {
        setItems(data)
        setTotal(data.length)
      } else if (data && typeof data === 'object') {
        const customersList = Array.isArray(data.items) ? data.items : (Array.isArray(data.customers) ? data.customers : [])
        setItems(customersList)
        setTotal(typeof data.total === 'number' ? data.total : customersList.length)
      } else {
        setItems([])
        setTotal(0)
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [limit, offset])

  useEffect(() => {
    fetchPage()
  }, [fetchPage])

  const filtered = items.filter((it) => it.name && it.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-primary">Customers</h1>
        <Link href="/customers/new" className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-white sm:w-auto">New</Link>
      </div>

      <div className="flex flex-col gap-2 sm:max-w-sm">
        <input placeholder="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} className="min-h-11 w-full rounded border p-2.5" />
      </div>

      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">{error}</div>}

       <EntityTable 
           items={filtered} 
           columns={[
             { key: "name", label: "Name" },
             { key: "phone", label: "Phone" },
             { key: "notes", label: "Notes" },
           ]}
           editHrefBase="/customers"
           entityName="Customer"
           onDeleteSuccess={fetchPage}
         />

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
