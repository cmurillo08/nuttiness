"use client"
import { useState } from "react"

export default function EntityForm({ endpoint, method = "POST", initialData = {}, fields = [], onSuccess }) {
  const [data, setData] = useState(() => ({ ...initialData }))
  const [errors, setErrors] = useState({})
  const [globalError, setGlobalError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

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
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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
      {globalError && <div className="text-red-600">{globalError}</div>}
      {fields.map((f) => (
        <div key={f.name}>
          <label className="block text-sm font-medium mb-1">{f.label}</label>
          {f.type === "textarea" ? (
            <textarea value={data[f.name] ?? ""} onChange={(e) => setField(f.name, e.target.value)} className="w-full p-2 border rounded" />
          ) : (
            <input
              type={f.type === "number" ? "number" : "text"}
              value={data[f.name] ?? ""}
              onChange={(e) => setField(f.name, f.type === "number" ? e.target.value : e.target.value)}
              className="w-full p-2 border rounded"
              min={f.min}
              max={f.max}
              step={f.step}
            />
          )}
          {errors[f.name] && <div className="text-red-600 text-sm">{errors[f.name]}</div>}
          {f.hint && <div className="text-xs text-gray-500">{f.hint}</div>}
        </div>
      ))}
      <div>
        <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded">
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  )
}
