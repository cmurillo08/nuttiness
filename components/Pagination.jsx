"use client"

export default function Pagination({ total, limit, offset, onLimitChange, onOffsetChange }) {
  const currentStart = offset + 1
  const currentEnd = Math.min(offset + limit, total)
  const hasNextPage = offset + limit < total
  const hasPrevPage = offset > 0

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-4">
        <div className="min-w-0 text-sm text-gray-700">
          Showing <span className="font-medium">{currentStart}</span> to <span className="font-medium">{currentEnd}</span> of <span className="font-medium">{total}</span>
        </div>

        <div className="flex items-center gap-2 w-full lg:justify-center">
        <button
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
          disabled={!hasPrevPage}
          className="flex-1 min-h-11 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 lg:flex-none"
        >
          Previous
        </button>
        
        <span className="shrink-0 text-center text-sm text-gray-600 min-w-max px-2">
          Page {Math.floor(offset / limit) + 1}
        </span>
        
        <button
          onClick={() => onOffsetChange(offset + limit)}
          disabled={!hasNextPage}
          className="flex-1 min-h-11 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 lg:flex-none"
        >
          Next
        </button>
        </div>

        <div className="hidden sm:flex items-center justify-start gap-2 lg:justify-end">
          <label htmlFor="limit-select" className="whitespace-nowrap text-sm font-medium text-gray-700">
            Items per page:
          </label>
          <select
            id="limit-select"
            value={limit}
            onChange={(e) => {
              const newLimit = Number(e.target.value)
              onLimitChange(newLimit)
            }}
            className="min-h-11 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
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
