"use client"
import { useEffect, useState } from "react"

export default function RawProductSelect({ value, onChange, placeholder = "Select a raw product" }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const extractItems = (data) => {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.items)) return data.items
    if (Array.isArray(data?.data)) return data.data
    return []
  }

  useEffect(() => {
    let mounted = true
    async function fetchItems() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/raw-products?limit=100&offset=0")
        if (!res.ok) throw new Error(`Failed to load raw products: ${res.status}`)
        const data = await res.json()
        if (mounted) setItems(extractItems(data))
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
          <option key={it.id} value={it.id}>{it.name} {it.supplier ? `- ${it.supplier}` : ""}</option>
        ))}
      </select>
    </div>
  )
}
