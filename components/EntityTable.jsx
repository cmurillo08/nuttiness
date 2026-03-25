"use client"
import { useEffect, useState } from "react"
import ConfirmDialog from "./ConfirmDialog"
import Link from "next/link"
import Amount from "./Amount"

export default function EntityTable({ columns = [], editHrefBase, viewHrefBase, entityName = "Item", items: propItems }) {
  const [items, setItems] = useState(propItems ?? [])
  const [loading, setLoading] = useState(!propItems)
  const [error, setError] = useState(null)
  const [confirm, setConfirm] = useState({ open: false, id: null })

  // Pluralize entity name
  function pluralize(name) {
    const words = name.split(' ')
    const lastWord = words[words.length - 1]
    const pluralLast = lastWord.endsWith('y') ? lastWord.slice(0, -1) + 'ies' : lastWord + 's'
    return words.length > 1 ? [...words.slice(0, -1), pluralLast].join(' ') : pluralLast
  }

  const pluralEntityName = pluralize(entityName)
  const routeBase = editHrefBase || viewHrefBase
  const apiBase = routeBase
    ? `/api${routeBase.startsWith('/') ? '' : '/'}${routeBase}`
    : null

  useEffect(() => {
    if (propItems) {
      setItems(propItems)
      setLoading(false)
      setError(null)
      return
    }

    async function fetchItems() {
      if (!apiBase) {
        setError('EntityTable requires editHrefBase or viewHrefBase when items are not provided')
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(apiBase)
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
        const list = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : [])
        setItems(list)
      } catch (e) {
        setError(String(e.message ?? e))
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [apiBase, propItems])

  function requestDelete(id) {
    setConfirm({ open: true, id })
  }

  async function doDelete() {
    const id = confirm.id
    try {
      if (!apiBase) throw new Error('Missing API base route for delete action')
      const res = await fetch(`${apiBase}/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
      setItems((s) => s.filter((i) => String(i.id) !== String(id)))
    } catch (e) {
      setError(String(e))
    } finally {
      setConfirm({ open: false, id: null })
    }
  }

  return (
    <div className="p-4">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-primary">{pluralEntityName}</h2>
        </div>
        {loading && <div>Loading…</div>}
        {error && (
          <div className="text-red-600">
            <div>{error}</div>
          </div>
        )}
        {!loading && !items.length && <div className="text-sm text-gray-500">No items found.</div>}
      </div>
      {items.length > 0 && (
        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 330px)' }}>
          <table className="min-w-full table-auto divide-y divide-gray-100" style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%' }}>
            <thead className="sticky top-0 z-20">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="px-3 py-2 text-left text-sm text-primary font-medium bg-white border-b border-gray-200">
                    {c.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-left text-sm text-primary font-medium bg-white border-b border-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-gray-50">
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-2 text-sm align-top">
                      {c.render ? c.render(it) : (c.type === "amount" ? <Amount value={it[c.key]} /> : String(it[c.key] ?? ""))}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-sm align-top">
                    <div className="flex gap-2">
                      {viewHrefBase ? (
                        <Link className="text-primary hover:text-primary/80 transition-colors" title="View" href={`${viewHrefBase}/${it.id}`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                      ) : null}
                      {editHrefBase ? (
                        <Link className="text-primary hover:text-primary/80 transition-colors" title="Edit" href={`${editHrefBase}/${it.id}`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>
                      ) : null}
                      {editHrefBase ? (
                        <button className="text-red-600 hover:text-red-700 transition-colors" title="Delete" onClick={() => requestDelete(it.id)}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog open={confirm.open} title={`Delete ${entityName}`} onCancel={() => setConfirm({ open: false, id: null })} onConfirm={doDelete}>
        Are you sure you want to delete this {entityName.toLowerCase()}?
      </ConfirmDialog>
    </div>
  )
}
