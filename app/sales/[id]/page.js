"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Amount from "../../../components/Amount"
import StatusBadge from "../../../components/StatusBadge"

export default function Page() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id
  const [sale, setSale] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [editingLineId, setEditingLineId] = useState(null)
  const [editQty, setEditQty] = useState('')
  const [editPrice, setEditPrice] = useState('')

  useEffect(() => {
    if (!id) return
    fetchSale()
  }, [id])

  async function fetchSale() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/sales/${id}`)
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
      const d = await res.json()
      setSale(d)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  async function doTransition(to_status) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/sales/${id}/transition`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to_status }) })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.message || JSON.stringify(body))
        return
      }
      setSale(body)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  async function doCancel() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/sales/${id}/cancel`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.message || JSON.stringify(body))
        return
      }
      setSale(body)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  function startEdit(line) {
    setEditingLineId(line.id)
    setEditQty(String(line.quantity))
    setEditPrice(String(line.unit_price))
    setError(null)
  }

  async function saveLineEdit() {
    const qty = Number(editQty)
    const price = Number(editPrice)
    if (!(qty > 0)) {
      setError('Quantity must be > 0')
      return
    }
    if (!(price >= 0)) {
      setError('Unit price must be >= 0')
      return
    }

    setBusy(true)
    try {
      const res = await fetch(`/api/sales/${id}/items/${editingLineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty, unit_price: price })
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.message || `Error: ${res.status}`)
        return
      }
      await fetchSale()
      setEditingLineId(null)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  async function deleteLine(lineId) {
    if (!confirm('Delete this line?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/sales/${id}/items/${lineId}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.message || `Error: ${res.status}`)
        return
      }
      await fetchSale()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="p-6">Loading…</div>
  if (!sale) return <div className="p-6">Sale not found.</div>

  const lines = Array.isArray(sale.lines) ? sale.lines : []
  const canEdit = sale.status === 'prepared'

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/sales')} className="text-gray-600 hover:text-gray-900 text-xl font-bold">←</button>
          <div>
            <h1 className="text-3xl font-semibold text-primary mb-2">Sale</h1>
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-gray-600">Created: </span>
                <span className="font-medium">{sale.created_at ? new Date(sale.created_at).toLocaleString() : '-'}</span>
              </div>
              <div>
                <span className="text-gray-600">Customer: </span>
                <span className="font-medium">{sale.customer_name || '-'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600 mb-1">Status</div>
          <StatusBadge status={sale.status} />
        </div>
      </div>

      <div className="mb-6 p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
        <div className="text-sm text-gray-600">Total Amount</div>
        <div className="text-2xl font-bold text-primary"><Amount value={sale.total_amount} /></div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-primary mb-3">Order Items</h2>
        {lines.length === 0 && <div className="text-sm text-gray-500">No items.</div>}
        {lines.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border border-gray-200">
              <thead className="bg-primary/10 border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-primary">Product</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-primary">Qty</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-primary">Unit Price</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-primary">Line Total</th>
                  {canEdit && <th className="px-4 py-2 text-left text-sm font-semibold text-primary">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((ln) => (
                  <tr key={ln.id} className={editingLineId === ln.id ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 text-sm">{ln.product_name || '(custom)'}</td>
                    {editingLineId === ln.id ? (
                      <>
                        <td className="px-4 py-3 text-sm">
                          <input type="number" value={editQty} onChange={(e) => setEditQty(e.target.value)} className="w-20 px-2 py-1 border rounded" min="1" />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="w-24 px-2 py-1 border rounded" step="0.01" min="0" />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium"><Amount value={Number(editQty || 0) * Number(editPrice || 0)} /></td>
                        <td className="px-4 py-3 text-sm">
                          <button onClick={saveLineEdit} disabled={busy} className="px-2 py-1 bg-green-600 text-white rounded text-xs disabled:opacity-60 mr-1">Save</button>
                          <button onClick={() => setEditingLineId(null)} disabled={busy} className="px-2 py-1 bg-gray-400 text-white rounded text-xs">Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-sm">{ln.quantity}</td>
                        <td className="px-4 py-3 text-sm"><Amount value={ln.unit_price} /></td>
                        <td className="px-4 py-3 text-sm font-medium"><Amount value={ln.line_total} /></td>
                        {canEdit && (
                          <td className="px-4 py-3 text-sm flex gap-2">
                            <button onClick={() => startEdit(ln)} disabled={busy} className="text-primary hover:text-primary/80 transition-colors disabled:opacity-60" title="Edit">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button onClick={() => deleteLine(ln.id)} disabled={busy} className="text-red-600 hover:text-red-700 transition-colors disabled:opacity-60" title="Delete">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {error && <div className="text-red-600 bg-red-50 p-3 rounded mt-4">{error}</div>}

      <div className="flex gap-2 mt-6">
        {sale.status === 'prepared' && (
          <button onClick={() => doTransition('delivered')} disabled={busy || lines.length === 0} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-60 transition-colors">Mark Delivered</button>
        )}
        {sale.status === 'delivered' && (
          <button onClick={() => doTransition('paid')} disabled={busy} className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-60 transition-colors">Mark Paid</button>
        )}
        {(sale.status === 'prepared' || sale.status === 'delivered') && (
          <button onClick={doCancel} disabled={busy} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-60 transition-colors">Cancel Sale</button>
        )}
      </div>
    </div>
  )
}
