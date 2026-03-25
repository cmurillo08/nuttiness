"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import Amount from "../../components/Amount"
import StatusBadge from "../../components/StatusBadge"

export default function Page() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [limit] = useState(10)
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
      setItems(body.data || [])
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
  }, [offset, status])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" title="Back to Dashboard" className="hover:opacity-80 transition-opacity">
            <img src="/nuttiness-logo.png" alt="Dashboard" className="h-12 w-12 object-contain" />
          </Link>
          <h1 className="text-2xl font-semibold text-primary">Sales</h1>
        </div>
        <Link href="/sales/new" className="px-3 py-2 bg-primary text-white rounded-md">New</Link>
      </div>

      <div className="mb-4 flex gap-2 items-center flex-wrap">
        <label className="text-sm">Status:</label>
        <select value={status} onChange={(e) => { setOffset(0); setStatus(e.target.value) }} className="p-2 border rounded">
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

      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border border-gray-200 divide-y divide-gray-100">
            <thead className="bg-primary/10">
              <tr>
                <th className="px-3 py-2 text-left text-sm font-medium">Created</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Customer</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Status</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Total</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm">{it.created_at ? new Date(it.created_at).toLocaleString() : ''}</td>
                  <td className="px-3 py-2 text-sm">{it.customer_name || '-'}</td>
                  <td className="px-3 py-2 text-sm">
                    <StatusBadge status={it.status} />
                  </td>
                  <td className="px-3 py-2 text-sm font-medium">
                    <Amount value={it.total_amount} />
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <Link href={`/sales/${it.id}`} className="text-primary hover:text-primary/80 transition-colors" title="View">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm">Showing {items.length} of {total}</div>
        <div className="flex gap-2">
          <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0} className="px-3 py-1 border rounded disabled:opacity-60">Prev</button>
          <button onClick={() => setOffset(offset + limit)} disabled={offset + limit >= total} className="px-3 py-1 border rounded disabled:opacity-60">Next</button>
        </div>
      </div>
    </div>
  )
}
