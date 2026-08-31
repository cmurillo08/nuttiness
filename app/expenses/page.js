"use client"
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import EntityTable from "../../components/EntityTable"
import RawProductSelect from "../../components/RawProductSelect"
import Pagination from "../../components/Pagination"
import { createDeleteSuccessHandler, createSortChangeHandler } from "../../lib/list-page-client"
import { formatCalendarDate } from "../../lib/date"
import { ALLOWED_RANGES, DEFAULT_RANGE, RANGE_LABELS } from "../../lib/dateRange"

const COLUMNS = [
  { key: "purchased_at_display", label: "Purchased At", sortKey: "purchased_at", defaultOrder: "desc" },
  { key: "raw_product_display", label: "Raw Product", sortKey: "raw_product_name", defaultOrder: "asc" },
  { key: "quantity", label: "Quantity" },
  { key: "cost", label: "Cost", type: "amount" },
  { key: "notes", label: "Notes" },
]

export default function ExpensesPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterRawProduct, setFilterRawProduct] = useState(null)
  const [limit, setLimit] = useState(25)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [range, setRange] = useState(DEFAULT_RANGE)
  const [sort, setSort] = useState("purchased_at")
  const [order, setOrder] = useState("desc")

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      qs.set('limit', String(limit))
      qs.set('offset', String(offset))
      qs.set('sort', sort)
      qs.set('order', order)
      qs.set('range', range)
      if (filterRawProduct) qs.set('raw_product_id', String(filterRawProduct))
      const res = await fetch(`/api/expenses?${qs.toString()}`)
      if (!res.ok) throw new Error(`Failed to load expenses: ${res.status}`)
      let data = await res.json()
      let expensesArray = []
      let totalCount = 0

      if (Array.isArray(data)) {
        expensesArray = data
        totalCount = data.length
      } else if (data && typeof data === 'object') {
        expensesArray = Array.isArray(data.items) ? data.items : []
        totalCount = typeof data.total === 'number' ? data.total : 0
      }

      const mapped = expensesArray.map((it) => ({
        ...it,
        raw_product_name: it.raw_product?.name ?? it.raw_product_name ?? "",
        raw_product_display: `${it.raw_product?.name ?? it.raw_product_name ?? ""} ${it.raw_product?.supplier ? `- ${it.raw_product.supplier}` : ""}`,
        purchased_at_display: it.purchased_at ? formatCalendarDate(it.purchased_at) : '-'
      }))

      setItems(mapped)
      setTotal(totalCount)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [filterRawProduct, limit, offset, range, sort, order])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleSortChange = createSortChangeHandler(COLUMNS, { sort, setSort, setOrder, setOffset })
  const handleDeleteSuccess = createDeleteSuccessHandler({ offset, limit, total, setOffset, refetch: fetchItems })

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-primary">Expenses</h1>
        <Link href="/expenses/new" className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-white sm:w-auto">New</Link>
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
          <label className="text-sm">Raw Product:</label>
          <RawProductSelect value={filterRawProduct} onChange={setFilterRawProduct} placeholder="All raw products" />
        </div>
      </div>

      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">{error}</div>}

      <EntityTable
        items={items}
        columns={COLUMNS}
        editHrefBase="/expenses"
        entityName="Expense"
        onDeleteSuccess={handleDeleteSuccess}
        sort={sort}
        order={order}
        onSortChange={handleSortChange}
        emptyMessage={range === 'all' ? 'No expenses found.' : `No expenses in the last ${range} days.`}
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
