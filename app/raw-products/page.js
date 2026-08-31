"use client"
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import EntityTable from "../../components/EntityTable"
import Pagination from "../../components/Pagination"
import { createDeleteSuccessHandler, createSortChangeHandler } from "../../lib/list-page-client"

const COLUMNS = [
  { key: "name", label: "Name", sortKey: "name", defaultOrder: "asc" },
  { key: "unit", label: "Unit Size" },
  { key: "price", label: "Price", type: "amount" },
  { key: "supplier", label: "Supplier" },
]

export default function Page() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [limit, setLimit] = useState(25)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  // No date column is shown in this list, so default to sorting by name
  // rather than the backend's created_at default (avoids a "Default" ghost
  // option in the mobile sort <select>; see EntityTable's mobileSortValue).
  const [sort, setSort] = useState("name")
  const [order, setOrder] = useState("asc")

  const fetchPage = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/raw-products?limit=${limit}&offset=${offset}&sort=${sort}&order=${order}`)
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || `Error ${res.status}`)
      }
      const data = await res.json()
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
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [limit, offset, sort, order])

  useEffect(() => {
    fetchPage()
  }, [fetchPage])

  const handleSortChange = createSortChangeHandler(COLUMNS, { sort, setSort, setOrder, setOffset })
  const handleDeleteSuccess = createDeleteSuccessHandler({ offset, limit, total, setOffset, refetch: fetchPage })

  const filtered = items.filter((it) => it.name && it.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-primary">Raw Products</h1>
        <Link href="/raw-products/new" className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-white sm:w-auto">New</Link>
      </div>

      <div className="flex flex-col gap-2 sm:max-w-sm">
        <input placeholder="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} className="min-h-11 w-full rounded border p-2.5" />
      </div>

      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">{error}</div>}

       <EntityTable
          items={filtered}
          columns={COLUMNS}
          editHrefBase="/raw-products"
          entityName="Raw Product"
          onDeleteSuccess={handleDeleteSuccess}
          sort={sort}
          order={order}
          onSortChange={handleSortChange}
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
