"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import RawProductSelect from "./RawProductSelect"
import Amount from "./Amount"

export default function ExpenseForm({ endpoint = "/api/expenses", method = "POST", initialData = {}, onSuccess, cancelHref }) {
  const [data, setData] = useState(() => ({
    raw_product_id: initialData.raw_product_id ?? (initialData.raw_product?.id ?? ""),
    quantity: initialData.quantity ?? "",
    cost: initialData.cost ?? "",
    purchased_at: initialData.purchased_at ? (function () {
      try {
        const d = new Date(initialData.purchased_at)
        if (!isNaN(d)) return d.toISOString().slice(0, 10)
      } catch (e) {}
      return String(initialData.purchased_at).slice(0, 10)
    })() : "",
    notes: initialData.notes ?? "",
  }))
  const [errors, setErrors] = useState({})
  const [globalError, setGlobalError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [selectedRawProduct, setSelectedRawProduct] = useState(null)
  const router = useRouter()

  function setField(name, value) {
    setData((d) => ({ ...d, [name]: value }))
    setErrors((e) => ({ ...e, [name]: null }))
  }

  function validate() {
    const out = {}
    if (!data.purchased_at) out.purchased_at = "Required"
    const q = Number(data.quantity)
    if (isNaN(q) || q <= 0) out.quantity = "Must be a number > 0"
    const c = Number(data.cost)
    if (isNaN(c) || c < 0) out.cost = "Must be a number >= 0"
    return out
  }

  async function submit(e) {
    e && e.preventDefault()
    setGlobalError(null)
    const v = validate()
    if (Object.keys(v).length) return setErrors(v)
    setSubmitting(true)
    try {
      // normalize purchased_at: if user provided date-only (YYYY-MM-DD), convert to ISO datetime
      let purchased_at_val = data.purchased_at
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(purchased_at_val))) {
        purchased_at_val = String(purchased_at_val) + "T00:00:00Z"
      }

      const payload = {
        raw_product_id: data.raw_product_id || null,
        quantity: Number(data.quantity),
        cost: Number(data.cost),
        purchased_at: purchased_at_val,
        notes: data.notes || null,
      }
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (body && body.errors) setErrors(body.errors)
        if (body && body.message) setGlobalError(body.message)
        else setGlobalError(`Server error: ${res.status}`)
        return
      }
      if (onSuccess) return onSuccess(body)
      // default navigation after create/update
      if (method === "POST") router.push(`/expenses/${body.id}`)
      else router.push(`/expenses`)
    } catch (err) {
      setGlobalError(String(err))
    } finally {
      setSubmitting(false)
    }
  }

  // Fetch selected raw product details and set selectedRawProduct
  useEffect(() => {
    let mounted = true
    async function loadRawProduct() {
      const id = data.raw_product_id
      setSelectedRawProduct(null)
      if (!id) return
      try {
        const res = await fetch(`/api/raw-products/${id}`)
        if (!res.ok) return
        const body = await res.json()
        if (!mounted) return
        setSelectedRawProduct(body)
      } catch (err) {
        // ignore
      }
    }
    loadRawProduct()
    return () => { mounted = false }
  }, [data.raw_product_id])

  // Recompute cost as unit price * quantity whenever quantity or selected raw product changes
  useEffect(() => {
    const qty = Number(data.quantity)
    const price = selectedRawProduct ? Number(selectedRawProduct.price) : NaN
    if (!selectedRawProduct || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price)) {
      // clear cost when insufficient data
      setField('cost', "")
      return
    }
    const computed = Math.round((price * qty) * 100) / 100
    setField('cost', String(computed.toFixed(2)))
  }, [data.quantity, selectedRawProduct])

  return (
    <form onSubmit={submit} className="space-y-4">
      {globalError && <div className="text-red-600 bg-red-50 p-3 rounded">{globalError}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Raw product</label>
        <RawProductSelect value={data.raw_product_id} onChange={(v) => setField('raw_product_id', v)} />
        {selectedRawProduct ? (
          <div className="text-sm text-gray-600 mt-1">Price: <Amount value={selectedRawProduct.price} /></div>
        ) : null}
        {errors.raw_product_id && <div className="text-red-600 text-sm mt-1">{errors.raw_product_id}</div>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
        <input type="number" step="0.01" value={data.quantity} onChange={(e) => setField('quantity', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        {errors.quantity && <div className="text-red-600 text-sm mt-1">{errors.quantity}</div>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cost (CRC)</label>
        <input readOnly type="number" step="0.01" value={data.cost} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50" />
        {errors.cost && <div className="text-red-600 text-sm mt-1">{errors.cost}</div>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Purchased at</label>
        <input type="date" value={data.purchased_at} onChange={(e) => setField('purchased_at', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        {errors.purchased_at && <div className="text-red-600 text-sm mt-1">{errors.purchased_at}</div>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea value={data.notes} onChange={(e) => setField('notes', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        {errors.notes && <div className="text-red-600 text-sm mt-1">{errors.notes}</div>}
      </div>

      <div className="flex gap-2">
        {cancelHref ? (
          <button type="button" onClick={() => router.push(cancelHref)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50">Cancel</button>
        ) : null}
        <button type="submit" disabled={submitting} className="px-4 py-2 bg-primary text-white rounded-md">
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  )
}
