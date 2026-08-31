"use client"
import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Amount from "../../../components/Amount"
import StatusBadge from "../../../components/StatusBadge"
import ConfirmDialog from "../../../components/ConfirmDialog"
import { normalizeMoney, toCents } from "../../../lib/db/numbers"

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
  const [showCreditForm, setShowCreditForm] = useState(false)
  const [creditAmount, setCreditAmount] = useState('')
  const [creditNotes, setCreditNotes] = useState('')
  const [deleteCredit, setDeleteCredit] = useState(null)

  const fetchSale = useCallback(async () => {
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
  }, [id])

  useEffect(() => {
    if (!id) return
    fetchSale()
  }, [id, fetchSale])

  async function doTransition(to_status) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/sales/${id}/transition`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to_status }) })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(extractErrorMessage(body, res.status))
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
    if (!Number.isInteger(qty) || qty <= 0) {
      setError('Quantity must be a whole number greater than 0')
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

  if (loading) return <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">Loading…</div>
  if (!sale) return <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">Sale not found.</div>

  const lines = Array.isArray(sale.lines) ? sale.lines : []
  const canEdit = sale.status === 'ordered' || sale.status === 'prepared'

  // §4.1 — derived credit/payment state, read directly off the sale detail response.
  // The balance is server-computed; it is never recomputed here.
  const credits = Array.isArray(sale.credits) ? sale.credits : []
  const creditCount = sale.credit_count ?? credits.length
  // Coerce to a number: Postgres numeric columns come back as strings, and
  // sale.total_amount (the fallback when balance_due is absent) is one of them.
  const balanceDue = normalizeMoney(sale.balance_due ?? sale.total_amount)
  const amountPaid = sale.amount_paid ?? 0
  // Compare in integer cents, matching the server's toCents-based gates (R4 in
  // lib/services/sales.js), so a float rounding edge case can't leave a button
  // enabled/disabled out of step with what the API will actually accept.
  const balanceDueCents = toCents(balanceDue)
  const showPayment = sale.status === 'delivered' || creditCount > 0
  const canAddCredit = sale.status === 'delivered' && balanceDueCents > 0
  const canEditCredits = sale.status !== 'paid'
  const payBlocked = creditCount > 0 && balanceDueCents > 0

  function openCreditForm() {
    setCreditAmount(String(balanceDue))
    setCreditNotes('')
    setError(null)
    setShowCreditForm(true)
  }

  function cancelCreditForm() {
    setShowCreditForm(false)
    setCreditAmount('')
    setCreditNotes('')
  }

  function extractErrorMessage(body, status) {
    if (body.error) return body.error
    if (body.message) return body.message
    if (body.errors) {
      if (typeof body.errors === 'string') return body.errors
      if (Array.isArray(body.errors) && body.errors[0]?.message) return body.errors[0].message
      if (body.errors.details && body.errors.details[0]?.message) return body.errors.details[0].message
    }
    return `Error: ${status}`
  }

  async function saveCredit() {
    const amount = Number(creditAmount)
    if (!(amount > 0)) {
      setError('Amount must be greater than 0')
      return
    }
    // Same check and order as addSaleCredit's server-side validation, so a
    // value that fails here would fail identically on submit.
    if (normalizeMoney(amount) !== amount) {
      setError('Amount cannot have more than 2 decimals')
      return
    }
    if (amount > balanceDue) {
      setError(`Amount cannot exceed the balance of ₡${balanceDue.toFixed(2)}`)
      return
    }

    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/sales/${id}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, notes: creditNotes.trim() ? creditNotes.trim() : null })
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(extractErrorMessage(body, res.status))
        return
      }
      setSale(body)
      setShowCreditForm(false)
      setCreditAmount('')
      setCreditNotes('')
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  async function confirmDeleteCredit() {
    if (!deleteCredit) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/sales/${id}/credits/${deleteCredit.id}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(extractErrorMessage(body, res.status))
        return
      }
      setSale(body)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
      setDeleteCredit(null)
    }
  }

  return (
    <div className="space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <button onClick={() => router.push('/sales')} className="text-gray-600 hover:text-gray-900 text-xl font-bold">←</button>
          <div className="min-w-0">
            <h1 className="mb-2 text-2xl font-semibold text-primary sm:text-3xl">Sale</h1>
            <div className="flex flex-col gap-1 text-sm sm:flex-row sm:flex-wrap sm:gap-6">
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
        <div className="sm:text-right">
          <div className="text-sm text-gray-600 mb-1">Status</div>
          <StatusBadge status={sale.status} />
        </div>
      </div>

      <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
        {!showPayment ? (
          <>
            <div className="text-sm text-gray-600">Total Amount</div>
            <div className="text-2xl font-bold text-primary"><Amount value={sale.total_amount} /></div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <div className="text-sm text-gray-600">Total Amount</div>
                <div className="text-2xl font-bold text-primary"><Amount value={sale.total_amount} /></div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Paid</div>
                <div className="text-lg font-semibold text-green-700"><Amount value={amountPaid} /></div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Balance</div>
                <div className={`text-2xl font-bold ${balanceDue > 0 ? 'text-amber-700' : 'text-green-700'}`}><Amount value={balanceDue} /></div>
              </div>
            </div>

            {canAddCredit && (
              <div className="mt-4">
                {!showCreditForm ? (
                  <button onClick={openCreditForm} disabled={busy} className="min-h-11 rounded-md border border-yellow-300 bg-yellow-50 px-4 py-2 font-medium text-yellow-800 transition-colors hover:bg-yellow-100 disabled:opacity-60">Record Credit</button>
                ) : (
                  <div className="space-y-3 rounded-md border border-primary/20 bg-white p-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        inputMode="decimal"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(e.target.value)}
                        disabled={busy}
                        className="min-h-11 w-full rounded border px-3 py-2 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Notes (optional)</label>
                      <input
                        type="text"
                        value={creditNotes}
                        onChange={(e) => setCreditNotes(e.target.value)}
                        disabled={busy}
                        className="min-h-11 w-full rounded border px-3 py-2 disabled:opacity-60"
                      />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button onClick={saveCredit} disabled={busy} className="min-h-11 rounded-md bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:opacity-60">Save</button>
                      <button onClick={cancelCreditForm} disabled={busy} className="min-h-11 rounded-md bg-gray-400 px-4 py-2 text-white transition-colors hover:bg-gray-500 disabled:opacity-60">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-primary mb-3">Order Items</h2>
        {lines.length === 0 && <div className="text-sm text-gray-500">No items.</div>}
        {lines.length > 0 && (
          <>
            <div className="space-y-3 lg:hidden">
              {lines.map((ln) => (
                <div key={ln.id} className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="text-sm font-medium">{ln.product_name}{ln.unit ? ` - ${ln.unit}` : ""} {!ln.product_name && !ln.unit ? '(custom)' : ""}</div>
                  {editingLineId === ln.id ? (
                    <div className="mt-3 space-y-2 text-sm">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Qty</label>
                        <input type="number" value={editQty} onChange={(e) => setEditQty(e.target.value)} className="min-h-10 w-full rounded border px-2 py-2" step="1" min="1" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Unit Price</label>
                        <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="min-h-10 w-full rounded border px-2 py-2" step="0.01" min="0" />
                      </div>
                      <div className="font-medium">Line Total: <Amount value={Number(editQty || 0) * Number(editPrice || 0)} /></div>
                      <div className="flex gap-2">
                        <button onClick={saveLineEdit} disabled={busy} className="min-h-10 rounded bg-green-600 px-3 text-xs text-white disabled:opacity-60">Save</button>
                        <button onClick={() => setEditingLineId(null)} disabled={busy} className="min-h-10 rounded bg-gray-400 px-3 text-xs text-white">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-1 text-sm">
                      <div>Qty: <span className="font-medium">{ln.quantity}</span></div>
                      <div>Unit Price: <span className="font-medium"><Amount value={ln.unit_price} /></span></div>
                      <div>Line Total: <span className="font-medium"><Amount value={ln.line_total} /></span></div>
                      {canEdit && (
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => startEdit(ln)} disabled={busy} className="min-h-10 rounded border border-primary/30 px-3 text-xs font-medium text-primary disabled:opacity-60">Edit</button>
                          <button onClick={() => deleteLine(ln.id)} disabled={busy} className="min-h-10 rounded border border-red-200 px-3 text-xs font-medium text-red-600 disabled:opacity-60">Delete</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full table-auto border border-gray-200">
                <thead className="border-b bg-primary/10">
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
                    <td className="px-4 py-3 text-sm">{ln.product_name}{ln.unit ? ` - ${ln.unit}` : ""} {!ln.product_name && !ln.unit ? '(custom)' : ""}</td>
                    {editingLineId === ln.id ? (
                      <>
                        <td className="px-4 py-3 text-sm">
                          <input type="number" value={editQty} onChange={(e) => setEditQty(e.target.value)} className="w-20 px-2 py-1 border rounded" step="1" min="1" />
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
          </>
        )}
      </div>

      {creditCount > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-primary mb-3">Credits (Partial Payments)</h2>

          <div className="space-y-3 lg:hidden">
            {credits.map((c) => (
              <div key={c.id} className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="text-sm text-gray-600">{new Date(c.recorded_at).toLocaleString()}</div>
                <div className="mt-1 text-sm font-semibold"><Amount value={c.amount} /></div>
                {c.notes && <div className="mt-1 text-sm text-gray-500">{c.notes}</div>}
                {canEditCredits && (
                  <div className="mt-2">
                    <button onClick={() => setDeleteCredit(c)} disabled={busy} className="min-h-10 rounded border border-red-200 px-3 text-xs font-medium text-red-600 disabled:opacity-60">Delete</button>
                  </div>
                )}
              </div>
            ))}
            <div className="text-sm font-medium text-gray-700">Total paid: <Amount value={amountPaid} /></div>
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full table-auto border border-gray-200">
              <thead className="border-b bg-primary/10">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-primary">Date</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-primary">Amount</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-primary">Notes</th>
                  {canEditCredits && <th className="px-4 py-2 text-left text-sm font-semibold text-primary">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {credits.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{new Date(c.recorded_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm font-medium"><Amount value={c.amount} /></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.notes || '-'}</td>
                    {canEditCredits && (
                      <td className="px-4 py-3 text-sm">
                        <button onClick={() => setDeleteCredit(c)} disabled={busy} className="text-red-600 hover:text-red-700 transition-colors disabled:opacity-60" title="Delete">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 text-sm font-medium text-gray-700">Total paid: <Amount value={amountPaid} /></div>
          </div>
        </div>
      )}

      {error && <div className="text-red-600 bg-red-50 p-3 rounded mt-4">{error}</div>}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {sale.status === 'ordered' && (
          <button onClick={() => doTransition('prepared')} disabled={busy || lines.length === 0} className="min-h-11 rounded-md bg-primary px-4 py-2 text-white transition-colors hover:bg-primary/90 disabled:opacity-60">Mark Prepared</button>
        )}
        {sale.status === 'prepared' && (
          <button onClick={() => doTransition('delivered')} disabled={busy || lines.length === 0} className="min-h-11 rounded-md bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:opacity-60">Mark Delivered</button>
        )}
        {sale.status === 'delivered' && (
          <button onClick={() => doTransition('paid')} disabled={busy || payBlocked} className="min-h-11 rounded-md bg-amber-600 px-4 py-2 text-white transition-colors hover:bg-amber-700 disabled:opacity-60">Mark Paid</button>
        )}
        {(sale.status === 'prepared' || sale.status === 'delivered') && (
          <button onClick={doCancel} disabled={busy} className="min-h-11 rounded-md bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 disabled:opacity-60">Cancel Sale</button>
        )}
      </div>

      {sale.status === 'delivered' && payBlocked && (
        <div className="text-sm text-amber-700">Record the remaining <Amount value={balanceDue} /> before marking this sale paid.</div>
      )}
      {sale.status === 'delivered' && creditCount > 0 && balanceDueCents === 0 && (
        <div className="text-sm text-green-700">Fully paid — ready to close.</div>
      )}

      <ConfirmDialog open={!!deleteCredit} title="Delete Credit" onCancel={() => setDeleteCredit(null)} onConfirm={confirmDeleteCredit}>
        This removes a recorded payment of <Amount value={deleteCredit?.amount} /> and increases the outstanding balance. This cannot be undone.
      </ConfirmDialog>
    </div>
  )
}
