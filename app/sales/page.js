"use client"
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import EntityTable from "../../components/EntityTable"
import StatusBadge from "../../components/StatusBadge"
import Pagination from "../../components/Pagination"
import { createDeleteSuccessHandler, createSortChangeHandler } from "../../lib/list-page-client"
import { ALLOWED_RANGES, DEFAULT_RANGE, RANGE_LABELS } from "../../lib/dateRange"

const COLUMNS = [
  {
    key: "created_at",
    label: "Created",
    sortKey: "created_at",
    defaultOrder: "desc",
    render: (it) => it.created_at ? new Date(it.created_at).toLocaleDateString() : '-'
  },
  { key: "customer_name", label: "Customer", sortKey: "customer_name", defaultOrder: "asc" },
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
]

// A sale can now be deleted from any status (see docs/plans/phase-12-new-improvements.md
// Addendum A.1), including delivered/paid sales that may carry recorded credits — deleting
// permanently loses that payment history via cascade delete. Call that out explicitly rather
// than reusing the generic one-line confirm every other entity gets.
function saleDeleteWarning(sale) {
  const hasPaymentHistory = sale && (sale.status === 'delivered' || sale.status === 'paid')
  return (
    <>
      Are you sure you want to delete this sale{sale?.status ? ` (${sale.status})` : ''}?
      {hasPaymentHistory && (
        <> This also permanently deletes any recorded payments/credits on it — that history cannot be recovered.</>
      )}
      {' '}This cannot be undone.
    </>
  )
}

function SalesTable({ items: propItems, sort, order, onSortChange, onDeleteSuccess }) {
  return (
    <>
      {propItems?.length > 0 && (
        <EntityTable
          items={propItems}
          columns={COLUMNS}
          viewHrefBase="/sales"
          deleteHrefBase="/sales"
          entityName="Sale"
          onDeleteSuccess={onDeleteSuccess}
          sort={sort}
          order={order}
          onSortChange={onSortChange}
          deleteWarning={saleDeleteWarning}
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
  const [range, setRange] = useState(DEFAULT_RANGE)
  const [sort, setSort] = useState("created_at")
  const [order, setOrder] = useState("desc")

  const fetchPage = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      qs.set('limit', String(limit))
      qs.set('offset', String(offset))
      qs.set('sort', sort)
      qs.set('order', order)
      qs.set('range', range)
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
  }, [offset, status, range, limit, sort, order])

  useEffect(() => {
    fetchPage()
  }, [fetchPage])

  const handleSortChange = createSortChangeHandler(COLUMNS, { sort, setSort, setOrder, setOffset })
  const handleDeleteSuccess = createDeleteSuccessHandler({ offset, limit, total, setOffset, refetch: fetchPage })

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-primary">Sales</h1>
        <Link href="/sales/new" className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-white sm:w-auto">New</Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
        <div className="flex flex-col gap-2 sm:max-w-xs">
          <label htmlFor="range-filter" className="text-sm">Date range:</label>
          <select
            id="range-filter"
            value={range}
            onChange={(e) => { setOffset(0); setRange(e.target.value) }}
            className="min-h-11 rounded border p-2.5"
          >
            {ALLOWED_RANGES.map((r) => (
              <option key={r} value={r}>{RANGE_LABELS[r]}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2 sm:max-w-xs">
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
      </div>

      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">{error}</div>}

      {!loading && !items.length && (
        <div className="text-sm text-gray-500">
          {range === 'all' ? 'No sales found.' : `No sales in the last ${range} days.`}
        </div>
      )}

      {items.length > 0 && (
        <SalesTable
          items={items}
          sort={sort}
          order={order}
          onSortChange={handleSortChange}
          onDeleteSuccess={handleDeleteSuccess}
        />
      )}

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
