"use client"

export default function Pagination({ total, limit, offset, onLimitChange, onOffsetChange }) {
  const currentStart = offset + 1
  const currentEnd = Math.min(offset + limit, total)
  const hasNextPage = offset + limit < total
  const hasPrevPage = offset > 0

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="text-sm text-gray-700 whitespace-nowrap min-w-0">
          Showing <span className="font-medium">{currentStart}</span> to <span className="font-medium">{currentEnd}</span> of <span className="font-medium">{total}</span>
        </div>

        <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
          disabled={!hasPrevPage}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        
        <span className="text-sm text-gray-600 min-w-max px-2">
          Page {Math.floor(offset / limit) + 1}
        </span>
        
        <button
          onClick={() => onOffsetChange(offset + limit)}
          disabled={!hasNextPage}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
        </div>

        <div className="flex items-center justify-end gap-2">
          <label htmlFor="limit-select" className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Items per page:
          </label>
          <select
            id="limit-select"
            value={limit}
            onChange={(e) => {
              const newLimit = Number(e.target.value)
              onLimitChange(newLimit)
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
    </div>
  )
}
