// Shared client-side handlers for the list pages (`app/{products,raw-products,
// expenses,customers,sales}/page.js`). Each page owns its own `sort`/`order`/
// `offset` state and fetcher, but the toggle-sort and refetch-after-delete
// logic is identical across all five — these factories keep that logic in
// one place instead of copy-pasted per page.
import { offsetAfterDelete } from "./pagination-client"

/**
 * Build an `onSortChange(key)` handler: clicking the currently active sort
 * key toggles its direction; clicking a different key selects it and applies
 * that column's `defaultOrder`. Always resets pagination to the first page.
 *
 * @param {{key: string, sortKey?: string, defaultOrder?: 'asc'|'desc'}[]} columns
 * @param {{ sort: string, setSort: Function, setOrder: Function, setOffset: Function }} state
 */
export function createSortChangeHandler(columns, { sort, setSort, setOrder, setOffset }) {
  return function handleSortChange(key) {
    setOffset(0)
    if (sort === key) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"))
    } else {
      const col = columns.find((c) => c.sortKey === key)
      setSort(key)
      setOrder(col?.defaultOrder || "asc")
    }
  }
}

/**
 * Build an `onDeleteSuccess()` handler for `EntityTable`: applies the
 * pagination-after-delete offset rule (see lib/pagination-client.js), and
 * only refetches directly when the offset itself doesn't change (changing
 * offset state already re-triggers the page's own fetch effect).
 *
 * @param {{ offset: number, limit: number, total: number, setOffset: Function, refetch: Function }} state
 */
export function createDeleteSuccessHandler({ offset, limit, total, setOffset, refetch }) {
  return function handleDeleteSuccess() {
    const newOffset = offsetAfterDelete({ offset, limit, total })
    if (newOffset !== offset) {
      setOffset(newOffset)
    } else {
      return refetch()
    }
  }
}
