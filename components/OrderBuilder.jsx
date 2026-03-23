"use client"
import { useEffect, useMemo, useState } from "react"
import Amount from "./Amount"

export default function OrderBuilder({ onSuccess }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [lines, setLines] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(Array.isArray(d) ? d : []))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const total = useMemo(() => lines.reduce((s, l) => s + (Number(l.qty || 0) * Number(l.unit_price || 0)), 0), [lines])

  function addLine(product) {
    setLines((s) => [...s, { id: Date.now(), product_id: product.id, product_name: product.name, qty: 1, unit_price: product.price || 0 }])
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
    const payload = { lines: lines.map((l) => ({ product_id: l.product_id, qty: Number(l.qty), unit_price: Number(l.unit_price) })), total_amount: total }
    try {
      const res = await fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.message || `Server error ${res.status}`)
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
        <h3 className="font-semibold">Products</h3>
        {loading && <div>Loading products…</div>}
        {products.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {products.map((p) => (
              <button key={p.id} onClick={() => addLine(p)} className="p-2 border rounded text-left">
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-gray-600"><Amount value={p.price} /></div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold">Order Lines</h3>
        {lines.length === 0 && <div className="text-sm text-gray-500">No lines. Click a product to add it.</div>}
        {lines.map((l) => (
          <div key={l.id} className="flex items-center gap-2 p-2 border rounded mb-2">
            <div className="flex-1">
              <div className="font-medium">{l.product_name}</div>
              <div className="flex gap-2 mt-1 items-center">
                <label className="text-xs">Qty</label>
                <input type="number" value={l.qty} onChange={(e) => updateLine(l.id, { qty: e.target.value })} className="w-20 p-1 border rounded" min="0" />
                <label className="text-xs">Unit</label>
                <input type="number" value={l.unit_price} onChange={(e) => updateLine(l.id, { unit_price: e.target.value })} className="w-28 p-1 border rounded" step="0.01" />
                <div className="ml-2">Line: <Amount value={Number(l.qty || 0) * Number(l.unit_price || 0)} /></div>
              </div>
            </div>
            <div>
              <button onClick={() => removeLine(l.id)} className="text-red-600">Remove</button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Total: <Amount value={total} /></div>
        <div>
          <button onClick={submit} disabled={submitting || lines.length === 0} className="px-4 py-2 bg-green-600 text-white rounded">
            {submitting ? 'Submitting…' : 'Submit Order'}
          </button>
        </div>
      </div>
      {error && <div className="text-red-600">{error}</div>}
    </div>
  )
}
