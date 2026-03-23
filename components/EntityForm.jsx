"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function EntityForm({ endpoint, method = "POST", initialData = {}, fields = [], onSuccess, cancelHref }) {
  const [data, setData] = useState(() => ({ ...initialData }))
  const [errors, setErrors] = useState({})
  const [globalError, setGlobalError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  // derive a sensible cancel href from the API endpoint when not provided
  const resolvedCancelHref = cancelHref ?? (() => {
    if (!endpoint || !endpoint.startsWith("/api")) return null
    // strip query string
    let path = endpoint.split('?')[0]
    // remove leading /api
    path = path.replace(/^\/api/, '')
    // remove trailing UUID-like segment (edit endpoints include the id)
    path = path.replace(/\/[0-9a-fA-F-]{36}$/, '')
    // normalize trailing slash (avoid empty string)
    if (path === '') path = '/'
    return path
  })()

  function setField(name, value) {
    setData((d) => ({ ...d, [name]: value }))
    setErrors((e) => ({ ...e, [name]: null }))
  }

  function validate() {
    const out = {}
    for (const f of fields) {
      const v = data[f.name]
      if (f.required && (v === undefined || v === "")) out[f.name] = "Required"
      if (f.type === "number") {
        const n = Number(v)
        if (isNaN(n)) out[f.name] = "Must be a number"
        if (f.min !== undefined && n < f.min) out[f.name] = `Must be >= ${f.min}`
        if (f.max !== undefined && n > f.max) out[f.name] = `Must be <= ${f.max}`
      }
    }
    return out
  }

  async function submit(e) {
    e && e.preventDefault()
    setGlobalError(null)
    const v = validate()
    if (Object.keys(v).length) return setErrors(v)
    setSubmitting(true)
    try {
      // Build payload from declared fields: convert numeric fields to Numbers
      // (2-decimal) and ensure all declared fields are included so updates
      // don't accidentally drop values (e.g., `supplier`). Omit server-managed
      // fields only for create requests.
      const payload = {}
      for (const f of fields) {
        const k = f.name
        if (method === "POST" && (k === "id" || k === "created_at" || k === "updated_at")) continue
        const v = data[k]
        if (f.type === "number") {
          const n = Number(v)
          payload[k] = isNaN(n) ? null : parseFloat(Number(n).toFixed(2))
        } else {
          payload[k] = v === undefined ? null : v
        }
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
      onSuccess && onSuccess(body)
    } catch (err) {
      setGlobalError(String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {globalError && <div className="text-red-600 bg-red-50 p-3 rounded">{globalError}</div>}
      {fields.map((f) => (
        <div key={f.name}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
          {f.type === "textarea" ? (
            <textarea
              value={data[f.name] ?? ""}
              onChange={(e) => setField(f.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          ) : (
            <input
              type={f.type === "number" ? "number" : "text"}
              value={data[f.name] ?? ""}
              onChange={(e) => setField(f.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30"
              min={f.min}
              max={f.max}
              step={f.step}
            />
          )}
          {errors[f.name] && <div className="text-red-600 text-sm mt-1">{errors[f.name]}</div>}
          {f.hint && <div className="text-xs text-gray-500 mt-1">{f.hint}</div>}
        </div>
      ))}
      <div className="flex gap-2">
        {resolvedCancelHref ? (
          <button
            type="button"
            onClick={() => router.push(resolvedCancelHref)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
        ) : null}
        <button type="submit" disabled={submitting} className="px-4 py-2 bg-primary text-white rounded-md hover:opacity-95">
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  )
}
