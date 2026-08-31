"use client"
import { useEffect, useMemo, useState } from "react"
import PreparedProductSelect from "./PreparedProductSelect"
import CustomerSelect from "./CustomerSelect"
import Amount from "./Amount"

export default function OrderBuilder({ onSuccess }) {
  const [lines, setLines] = useState([])
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState('ordered')
  const [customerId, setCustomerId] = useState(null)
  
  // Form state for adding new line
  const [selectedProductId, setSelectedProductId] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [newLineQty, setNewLineQty] = useState('')
  const [newLineUnitPrice, setNewLineUnitPrice] = useState('')

  // Fetch selected product details
  useEffect(() => {
    let mounted = true
    async function loadProduct() {
      setSelectedProduct(null)
      if (!selectedProductId) return
      try {
        const res = await fetch(`/api/products/${selectedProductId}`)
        if (!res.ok) return
        const body = await res.json()
        if (!mounted) return
        setSelectedProduct(body)
        setNewLineUnitPrice(String(body.price || 0))
      } catch (err) {
        // ignore
      }
    }
    loadProduct()
    return () => { mounted = false }
  }, [selectedProductId])

  const total = useMemo(() => lines.reduce((s, l) => s + (Number(l.qty || 0) * Number(l.unit_price || 0)), 0), [lines])

  function addLineFromForm() {
    if (!selectedProductId) {
      setError('Please select a product')
      return
    }
    const qty = Number(newLineQty)
    const unitPrice = Number(newLineUnitPrice)
    if (!Number.isInteger(qty) || qty <= 0) {
      setError('Quantity must be a whole number greater than 0')
      return
    }
    if (!(unitPrice >= 0)) {
      setError('Unit price must be >= 0')
      return
    }

    setLines((s) => [...s, {
      id: Date.now(),
      prepared_product_id: selectedProductId,
      product_name: selectedProduct?.name || '',
      qty,
      unit_price: unitPrice
    }])
    
    // Reset form
    setSelectedProductId(null)
    setSelectedProduct(null)
    setNewLineQty('')
    setNewLineUnitPrice('')
    setError(null)
  }

  function updateLine(id, patch) {
    setLines((s) => s.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  function removeLine(id) {
    setLines((s) => s.filter((l) => l.id !== id))
  }

  async function submit() {
    setSubmitting(true)
    setError(null)
    // client-side validation
    if (!customerId) {
      setError('Please select a customer')
      setSubmitting(false)
      return
    }
    if (!lines.length) {
      setError('Add at least one line before submitting')
      setSubmitting(false)
      return
    }
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      const qty = Number(l.qty)
      const up = Number(l.unit_price)
      if (!Number.isInteger(qty) || qty <= 0) {
        setError(`Line ${i + 1}: quantity must be a whole number greater than 0`)
        setSubmitting(false)
        return
      }
      if (!(up >= 0)) {
        setError(`Line ${i + 1}: unit_price must be >= 0`)
        setSubmitting(false)
        return
      }
    }

    const payload = { customer_id: customerId || null, lines: lines.map((l) => ({ prepared_product_id: l.prepared_product_id || null, quantity: Number(l.qty), unit_price: Number(l.unit_price) })), status }
    try {
      const res = await fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (body && body.details && Array.isArray(body.details)) {
          setError(body.details.map((d) => d.message || JSON.stringify(d)).join('\n'))
        } else {
          setError(body.message || `Server error ${res.status}`)
        }
        return
      }
      setLines([])
      onSuccess && onSuccess(body)
    } catch (e) {
      setError(String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium mb-2">Customer <span className="text-red-600">*</span></label>
        <CustomerSelect
          value={customerId}
          onChange={setCustomerId}
          placeholder="Select a customer"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">Add Product</h3>
        </div>
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Prepared Product</label>
            <PreparedProductSelect 
              value={selectedProductId} 
              onChange={setSelectedProductId}
              placeholder="Choose a product..."
            />
            {selectedProduct && (
              <div className="text-sm text-gray-600 mt-1">
                Price: <Amount value={selectedProduct.price} />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input 
              type="number" 
              value={newLineQty}
              onChange={(e) => setNewLineQty(e.target.value)}
              placeholder="0"
              step="1"
              min="1"
              inputMode="numeric"
              className="min-h-11 w-full rounded-md border border-gray-300 px-3 py-2.5"
            />
          </div>

          {newLineQty && newLineUnitPrice && (
            <div className="text-sm font-medium bg-blue-50 p-2 rounded border border-blue-100">
              Line Total: <Amount value={Number(newLineQty || 0) * Number(newLineUnitPrice || 0)} />
            </div>
          )}

          <button 
            type="button"
            onClick={addLineFromForm}
            disabled={!selectedProductId || !newLineQty}
            className="min-h-11 w-full rounded-md bg-blue-600 px-3 py-2 text-white disabled:opacity-60 hover:bg-blue-700"
          >
            Add to Order
          </button>
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-semibold">Order Lines</h3>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <label className="text-sm">Initial status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="min-h-11 rounded border px-3 py-2 sm:min-h-0 sm:px-2 sm:py-1">
              <option value="ordered">ordered</option>
              <option value="prepared">prepared</option>
              <option value="delivered">delivered</option>
              <option value="paid">paid</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>
        </div>
        {lines.length === 0 && <div className="text-sm text-gray-500">No lines. Add products above.</div>}
        {lines.map((l) => (
          <div key={l.id} className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
              <div className="font-medium">
                {l.product_name || <input placeholder="Name" value={l.product_name} onChange={(e) => updateLine(l.id, { product_name: e.target.value })} className="min-h-10 w-full rounded border px-2 py-2 sm:w-48 sm:py-1" />}
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-[auto_96px_auto_112px_1fr] sm:items-center">
                <label className="text-xs font-medium sm:text-right">Qty</label>
                <input type="number" value={l.qty} onChange={(e) => updateLine(l.id, { qty: e.target.value })} className="min-h-10 w-full rounded border p-2 sm:min-h-0 sm:p-1" step="1" min="1" inputMode="numeric" />
                <label className="text-xs font-medium sm:text-right">Unit Price</label>
                <input type="number" value={l.unit_price} onChange={(e) => updateLine(l.id, { unit_price: e.target.value })} className="min-h-10 w-full rounded border p-2 sm:min-h-0 sm:p-1" step="0.01" />
                <div className="font-medium sm:ml-auto">Line: <Amount value={Number(l.qty || 0) * Number(l.unit_price || 0)} /></div>
              </div>
            </div>
              <button onClick={() => removeLine(l.id)} className="inline-flex min-h-10 items-center justify-center self-end rounded-md border border-red-200 px-3 text-sm font-medium text-red-600 hover:text-red-700 sm:self-start" title="Delete">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-lg font-semibold">Total: <Amount value={total} /></div>
        <button onClick={submit} disabled={submitting || !customerId || lines.length === 0} className="min-h-11 w-full rounded bg-green-600 px-4 py-2 text-white disabled:opacity-60 hover:bg-green-700 sm:w-auto">
          {submitting ? 'Submitting…' : 'Submit Order'}
        </button>
      </div>
      {error && <div className="text-red-600 bg-red-50 p-3 rounded whitespace-pre-wrap">{error}</div>}
    </div>
  )
}
