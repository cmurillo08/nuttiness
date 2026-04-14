"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import EntityTable from "../../components/EntityTable"
import StatusBadge from "../../components/StatusBadge"
import Pagination from "../../components/Pagination"

function SalesTable({ items: propItems }) {
  return (
    <>
      {propItems?.length > 0 && (
        <EntityTable 
          items={propItems}
          columns={[
            { 
              key: "created_at", 
              label: "Created",
              render: (it) => it.created_at ? new Date(it.created_at).toLocaleDateString() : '-'
            },
            { key: "customer_name", label: "Customer" },
            { 
              key: "status", 
              label: "Status",
              render: (it) => <StatusBadge status={it.status} />
            },
            { 
              key: "total_amount", 
              label: "Total",
              type: "amount"
            },
          ]}
          viewHrefBase="/sales"
          entityName="Sale"
        />
      )}
    </>
  )
}

export default function Page() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [limit, setLimit] = useState(25)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState("")

  async function fetchPage() {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      qs.set('limit', String(limit))
      qs.set('offset', String(offset))
      if (status) qs.set('status', status)
      const res = await fetch(`/api/sales?${qs.toString()}`)
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
      const body = await res.json()
      setItems(body.data || body.items || [])
      setTotal(Number(body.total || 0))
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, status, limit])

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-primary">Sales</h1>
        <Link href="/sales/new" className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-white sm:w-auto">New</Link>
      </div>

      <div className="flex flex-col gap-2 sm:max-w-sm">
        <label className="text-sm">Status:</label>
        <select value={status} onChange={(e) => { setOffset(0); setStatus(e.target.value) }} className="min-h-11 rounded border p-2.5">
          <option value="">All</option>
          <option value="ordered">ordered</option>
          <option value="prepared">prepared</option>
          <option value="delivered">delivered</option>
          <option value="paid">paid</option>
          <option value="cancelled">cancelled</option>
        </select>
      </div>

      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">{error}</div>}

      {!loading && !items.length && <div className="text-sm text-gray-500">No sales found.</div>}

      {items.length > 0 && <SalesTable items={items} />}

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
