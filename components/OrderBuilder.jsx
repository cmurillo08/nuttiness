"use client"
import { useEffect, useMemo, useState } from "react"
import PreparedProductSelect from "./PreparedProductSelect"
import CustomerSelect from "./CustomerSelect"
import Amount from "./Amount"

export default function OrderBuilder({ onSuccess }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [lines, setLines] = useState([])
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState('prepared')
  const [customerId, setCustomerId] = useState(null)
  
  // Form state for adding new line
  const [selectedProductId, setSelectedProductId] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [newLineQty, setNewLineQty] = useState('')
  const [newLineUnitPrice, setNewLineUnitPrice] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(Array.isArray(d) ? d : []))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

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
    if (!(qty > 0)) {
      setError('Quantity must be > 0')
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
      if (!(qty > 0)) {
        setError(`Line ${i + 1}: quantity must be > 0`)
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
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Customer <span className="text-red-600">*</span></label>
        <CustomerSelect
          value={customerId}
          onChange={setCustomerId}
          placeholder="Select a customer"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Add Product</h3>
        </div>
        <div className="space-y-3 p-3 border rounded-md bg-gray-50">
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
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md" 
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
            className="w-full px-3 py-2 bg-blue-600 text-white rounded-md disabled:opacity-60 hover:bg-blue-700"
          >
            Add to Order
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Order Lines</h3>
          <div className="flex items-center gap-2">
            <label className="text-sm">Initial status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-2 py-1 border rounded">
              <option value="prepared">prepared</option>
              <option value="delivered">delivered</option>
              <option value="paid">paid</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>
        </div>
        {lines.length === 0 && <div className="text-sm text-gray-500">No lines. Add products above.</div>}
        {lines.map((l) => (
          <div key={l.id} className="flex items-center gap-2 p-3 border rounded mb-2 bg-gray-50">
            <div className="flex-1">
              <div className="font-medium">
                {l.product_name || <input placeholder="Name" value={l.product_name} onChange={(e) => updateLine(l.id, { product_name: e.target.value })} className="px-2 py-1 border rounded w-48" />}
              </div>
              <div className="flex gap-2 mt-2 items-center text-sm">
                <label className="text-xs font-medium">Qty:</label>
                <input type="number" value={l.qty} onChange={(e) => updateLine(l.id, { qty: e.target.value })} className="w-20 p-1 border rounded" step="0.01" min="0" />
                <label className="text-xs font-medium">Unit Price:</label>
                <input type="number" value={l.unit_price} onChange={(e) => updateLine(l.id, { unit_price: e.target.value })} className="w-24 p-1 border rounded" step="0.01" />
                <div className="ml-auto font-medium">Line: <Amount value={Number(l.qty || 0) * Number(l.unit_price || 0)} /></div>
              </div>
            </div>
            <button onClick={() => removeLine(l.id)} className="text-red-600 font-medium hover:text-red-800">
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-lg font-semibold">Total: <Amount value={total} /></div>
        <button onClick={submit} disabled={submitting || !customerId || lines.length === 0} className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-60 hover:bg-green-700">
          {submitting ? 'Submitting…' : 'Submit Order'}
        </button>
      </div>
      {error && <div className="text-red-600 bg-red-50 p-3 rounded whitespace-pre-wrap">{error}</div>}
    </div>
  )
}
