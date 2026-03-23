"use client"
import { useEffect, useState } from "react"
import ConfirmDialog from "./ConfirmDialog"
import Link from "next/link"
import Amount from "./Amount"

export default function EntityTable({ endpoint = "/api/products", columns = [], title = "Items", editHrefBase, items: propItems }) {
  const [items, setItems] = useState(propItems ?? [])
  const [loading, setLoading] = useState(!propItems)
  const [error, setError] = useState(null)
  const [confirm, setConfirm] = useState({ open: false, id: null })

  useEffect(() => {
    if (propItems) {
      setItems(propItems)
      setLoading(false)
      setError(null)
      return
    }

    async function fetchItems() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(endpoint)
        if (!res.ok) {
          const text = await res.text()
          const msg = text && text.trim().startsWith("<") ? `Server error ${res.status}` : `Error ${res.status}: ${text}`
          throw new Error(msg)
        }
        let data
        try {
          data = await res.json()
        } catch (e) {
          throw new Error("Invalid JSON response from server")
        }
        setItems(Array.isArray(data) ? data : [])
      } catch (e) {
        setError(String(e.message ?? e))
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [endpoint, propItems])

  function requestDelete(id) {
    setConfirm({ open: true, id })
  }

  async function doDelete() {
    const id = confirm.id
    try {
      const base = endpoint.split('?')[0]
      const res = await fetch(`${base}/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
      setItems((s) => s.filter((i) => String(i.id) !== String(id)))
    } catch (e) {
      setError(String(e))
    } finally {
      setConfirm({ open: false, id: null })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-primary">{title}</h2>
      </div>
      {loading && <div>Loading…</div>}
      {error && (
        <div className="text-red-600">
          <div>{error}</div>
        </div>
      )}
      {!loading && !items.length && <div className="text-sm text-gray-500">No items found.</div>}
      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border border-gray-200 divide-y divide-gray-100">
            <thead className="bg-primary/10">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="px-3 py-2 text-left text-sm text-primary font-medium">
                    {c.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-left text-sm text-primary font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-gray-50">
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-2 text-sm align-top">
                      {c.type === "amount" ? <Amount value={it[c.key]} /> : String(it[c.key] ?? "")}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-sm align-top">
                    {editHrefBase ? (
                      <Link className="text-primary mr-2" href={`${editHrefBase}/${it.id}`}>Edit</Link>
                    ) : null}
                    <button className="text-red-600" onClick={() => requestDelete(it.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog open={confirm.open} title="Delete item" onCancel={() => setConfirm({ open: false, id: null })} onConfirm={doDelete}>
        Are you sure you want to delete this item?
      </ConfirmDialog>
    </div>
  )
}
