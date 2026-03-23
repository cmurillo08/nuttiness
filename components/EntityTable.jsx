"use client"
import { useEffect, useState } from "react"
import ConfirmDialog from "./ConfirmDialog"
import Link from "next/link"
import Amount from "./Amount"

export default function EntityTable({ endpoint = "/api/products", columns = [], title = "Items", editHrefBase }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirm, setConfirm] = useState({ open: false, id: null })

  useEffect(() => {
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
  }, [endpoint])

  function requestDelete(id) {
    setConfirm({ open: true, id })
  }

  async function doDelete() {
    const id = confirm.id
    try {
      const res = await fetch(`${endpoint}/${id}`, { method: "DELETE" })
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
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      {loading && <div>Loading…</div>}
      {error && (
        <div className="text-red-600">
          <div>{error}</div>
          <button className="mt-2 text-sm text-blue-600" onClick={() => {
            setError(null)
            setLoading(true)
            fetch(endpoint).then(async (res) => {
              if (!res.ok) {
                const t = await res.text()
                throw new Error(t && t.trim().startsWith('<') ? `Server error ${res.status}` : `Error ${res.status}: ${t}`)
              }
              return res.json()
            }).then((data) => setItems(Array.isArray(data) ? data : [])).catch((e) => setError(String(e.message ?? e))).finally(() => setLoading(false))
          }}>Retry</button>
        </div>
      )}
      {!loading && !items.length && <div className="text-sm text-gray-500">No items found.</div>}
      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="px-3 py-2 text-left text-sm">
                    {c.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-left text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t hover:bg-gray-50">
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-2 text-sm">
                      {c.type === "amount" ? <Amount value={it[c.key]} /> : String(it[c.key] ?? "")}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-sm">
                    {editHrefBase ? (
                      <Link className="text-blue-600 mr-2" href={`${editHrefBase}/${it.id}`}>Edit</Link>
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
