"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import RawProductSelect from "./RawProductSelect"
import Amount from "./Amount"
import { toCalendarDateInput, toCalendarDateISO } from "../lib/date"

export default function ExpenseForm({ endpoint = "/api/expenses", method = "POST", initialData = {}, onSuccess, cancelHref }) {
  const [data, setData] = useState(() => ({
    raw_product_id: initialData.raw_product_id ?? (initialData.raw_product?.id ?? ""),
    quantity: initialData.quantity ?? "",
    cost: initialData.cost ?? "",
    purchased_at: toCalendarDateInput(initialData.purchased_at),
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
    if (!Number.isInteger(q) || q <= 0) out.quantity = "Must be a whole number greater than 0"
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
      const payload = {
        raw_product_id: data.raw_product_id || null,
        quantity: Number(data.quantity),
        cost: Number(data.cost),
        purchased_at: toCalendarDateISO(data.purchased_at),
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
        <input type="number" value={data.quantity} onChange={(e) => setField('quantity', e.target.value)} step="1" min="1" inputMode="numeric" className="min-h-11 w-full rounded-md border border-gray-300 px-3 py-2.5" />
        {errors.quantity && <div className="text-red-600 text-sm mt-1">{errors.quantity}</div>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cost (CRC)</label>
        <input readOnly type="number" step="0.01" value={data.cost} className="min-h-11 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2.5" />
        {errors.cost && <div className="text-red-600 text-sm mt-1">{errors.cost}</div>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Purchased at</label>
        <input type="date" value={data.purchased_at} onChange={(e) => setField('purchased_at', e.target.value)} className="min-h-11 w-full rounded-md border border-gray-300 px-3 py-2.5" />
        {errors.purchased_at && <div className="text-red-600 text-sm mt-1">{errors.purchased_at}</div>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea value={data.notes} onChange={(e) => setField('notes', e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2.5" />
        {errors.notes && <div className="text-red-600 text-sm mt-1">{errors.notes}</div>}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {cancelHref ? (
          <button type="button" onClick={() => router.push(cancelHref)} className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 sm:w-auto">Cancel</button>
        ) : null}
        <button type="submit" disabled={submitting} className="min-h-11 w-full rounded-md bg-primary px-4 py-2 text-white sm:w-auto">
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  )
}
