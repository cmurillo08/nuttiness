"use client"
import { useEffect, useState } from "react"

export default function PreparedProductSelect({ value, onChange, placeholder = "Select a prepared product" }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    async function fetchItems() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/products")
        if (!res.ok) throw new Error(`Failed to load prepared products: ${res.status}`)
        const data = await res.json()
        if (mounted) setItems(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(String(err))
      } finally {
        setLoading(false)
      }
    }
    fetchItems()
    return () => { mounted = false }
  }, [])

  return (
    <div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <select
        value={value ?? ""}
        onChange={(e) => onChange && onChange(e.target.value === "" ? null : e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <option value="">{loading ? "Loading..." : placeholder}</option>
        {items.map((it) => (
          <option key={it.id} value={it.id}>{it.name} {it.unit ? `- ${it.unit}` : ""}</option>
        ))}
      </select>
    </div>
  )
}
