"use client"
import { useEffect, useState } from "react"
import ConfirmDialog from "./ConfirmDialog"
import Link from "next/link"
import Amount from "./Amount"

export default function EntityTable({
  columns = [],
  editHrefBase,
  viewHrefBase,
  deleteHrefBase,
  entityName = "Item",
  items: propItems,
  onDeleteSuccess,
  deleteWarning,
  sort,
  order,
  onSortChange,
  emptyMessage = "No items found.",
}) {
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
  const routeBase = editHrefBase || viewHrefBase || deleteHrefBase
  const apiBase = routeBase
    ? `/api${routeBase.startsWith('/') ? '' : '/'}${routeBase}`
    : null

  const confirmItem = items.find((i) => String(i.id) === String(confirm.id))

  const sortableColumns = columns.filter((c) => c.sortKey)
  const canSort = sortableColumns.length > 0 && typeof onSortChange === 'function'
  const currentSortMatchesColumn = sortableColumns.some((c) => c.sortKey === sort)
  const mobileSortValue = currentSortMatchesColumn ? sort : (sort || '')

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

  function showDeleteFor() {
    return Boolean(editHrefBase || deleteHrefBase)
  }

  async function doDelete() {
    const id = confirm.id
    try {
      if (!apiBase) throw new Error('Missing API base route for delete action')
      const res = await fetch(`${apiBase}/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || body.message || `Delete failed: ${res.status}`)
      }
      if (onDeleteSuccess) {
        await onDeleteSuccess(id)
      } else {
        setItems((s) => s.filter((i) => String(i.id) !== String(id)))
      }
    } catch (e) {
      setError(e && e.message ? e.message : String(e))
    } finally {
      setConfirm({ open: false, id: null })
    }
  }

  function renderCell(item, column) {
    if (column.render) return column.render(item)
    if (column.type === "amount") return <Amount value={item[column.key]} />
    return String(item[column.key] ?? "")
  }

  function isActiveSortColumn(column) {
    return Boolean(column.sortKey) && column.sortKey === sort
  }

  function ariaSortFor(column) {
    if (!isActiveSortColumn(column)) return 'none'
    return order === 'desc' ? 'descending' : 'ascending'
  }

  function sortIndicator(column) {
    if (!isActiveSortColumn(column)) return null
    return <span aria-hidden="true">{order === 'desc' ? '▼' : '▲'}</span>
  }

  function headerContent(column) {
    if (!column.sortKey) return column.label
    return (
      <button
        type="button"
        onClick={() => onSortChange(column.sortKey)}
        className="inline-flex items-center gap-1 text-left font-medium text-primary hover:text-primary/80"
      >
        {column.label}
        {sortIndicator(column)}
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">{pluralEntityName}</h2>
        </div>
        {loading && <div>Loading…</div>}
        {error && (
          <div className="text-red-600">
            <div>{error}</div>
          </div>
        )}
        {!loading && !items.length && <div className="text-sm text-gray-500">{emptyMessage}</div>}
      </div>
      {items.length > 0 && (
        <>
          {canSort && (
            <div className="flex items-center gap-2 lg:hidden">
              <label htmlFor="entity-table-sort" className="shrink-0 text-sm font-medium text-gray-700">
                Sort by
              </label>
              <select
                id="entity-table-sort"
                value={mobileSortValue}
                onChange={(e) => onSortChange(e.target.value)}
                className="min-h-11 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {!currentSortMatchesColumn && (
                  <option value={mobileSortValue}>Default</option>
                )}
                {sortableColumns.map((c) => (
                  <option key={c.sortKey} value={c.sortKey}>{c.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => sort && onSortChange(sort)}
                disabled={!sort}
                aria-label={`Toggle sort direction, currently ${order === 'desc' ? 'descending' : 'ascending'}`}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-gray-300 text-base disabled:opacity-50"
              >
                {order === 'desc' ? '▼' : '▲'}
              </button>
            </div>
          )}

          <div className="space-y-3 lg:hidden">
            {items.map((it) => (
              <div key={it.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <dl className="space-y-2">
                  {columns.map((c) => (
                    <div key={c.key} className="flex flex-col gap-1">
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{c.label}</dt>
                      <dd className="text-sm text-slate-900">{renderCell(it, c)}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                  {viewHrefBase ? (
                    <Link
                      className="inline-flex min-h-10 items-center rounded-md border border-primary/30 px-3 text-sm font-medium text-primary"
                      href={`${viewHrefBase}/${it.id}`}
                    >
                      View
                    </Link>
                  ) : null}
                  {editHrefBase ? (
                    <Link
                      className="inline-flex min-h-10 items-center rounded-md border border-primary/30 px-3 text-sm font-medium text-primary"
                      href={`${editHrefBase}/${it.id}`}
                    >
                      Edit
                    </Link>
                  ) : null}
                  {showDeleteFor(it) ? (
                    <button
                      className="inline-flex min-h-10 items-center rounded-md border border-red-200 px-3 text-sm font-medium text-red-600"
                      onClick={() => requestDelete(it.id)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-auto lg:block" style={{ maxHeight: 'calc(100vh - 330px)' }}>
            <table className="min-w-full table-auto divide-y divide-gray-100" style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%' }}>
              <thead className="sticky top-0 z-20">
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={c.sortKey ? ariaSortFor(c) : undefined}
                      className="border-b border-gray-200 bg-white px-3 py-2 text-left text-sm font-medium text-primary"
                    >
                      {headerContent(c)}
                    </th>
                  ))}
                  <th className="border-b border-gray-200 bg-white px-3 py-2 text-left text-sm font-medium text-primary">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-gray-50">
                    {columns.map((c) => (
                      <td key={c.key} className="px-3 py-2 align-top text-sm">
                        {renderCell(it, c)}
                      </td>
                    ))}
                    <td className="px-3 py-2 align-top text-sm">
                      <div className="flex gap-2">
                        {viewHrefBase ? (
                          <Link className="text-primary transition-colors hover:text-primary/80" title="View" href={`${viewHrefBase}/${it.id}`}>
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                        ) : null}
                        {editHrefBase ? (
                          <Link className="text-primary transition-colors hover:text-primary/80" title="Edit" href={`${editHrefBase}/${it.id}`}>
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                        ) : null}
                        {showDeleteFor(it) ? (
                          <button className="text-red-600 transition-colors hover:text-red-700" title="Delete" onClick={() => requestDelete(it.id)}>
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        </>
      )}

      <ConfirmDialog open={confirm.open} title={`Delete ${entityName}`} onCancel={() => setConfirm({ open: false, id: null })} onConfirm={doDelete}>
        {typeof deleteWarning === 'function'
          ? deleteWarning(confirmItem)
          : `Are you sure you want to delete this ${entityName.toLowerCase()}?`}
      </ConfirmDialog>
    </div>
  )
}
