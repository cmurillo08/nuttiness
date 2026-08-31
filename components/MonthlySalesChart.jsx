"use client"
import Amount from "./Amount"

const CHART_HEIGHT_PX = 140
const MIN_BAR_HEIGHT_PX = 4

function monthLabel(monthStr) {
  if (!monthStr) return ""
  const [year, month] = String(monthStr).split("-").map(Number)
  if (!year || !month) return monthStr
  const d = new Date(Date.UTC(year, month - 1, 1))
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit", timeZone: "UTC" })
}

// Dependency-free Tailwind bar chart for the sales-monthly report.
// Purely visual — the accompanying screen-reader table (rendered by the
// caller) carries the accessible representation of the same data, so this
// chart is marked aria-hidden.
export default function MonthlySalesChart({ items = [] }) {
  if (!items.length) {
    return <div className="text-sm text-gray-500">No paid sales yet</div>
  }

  const max = Math.max(0, ...items.map((it) => Number(it.total_amount) || 0))

  return (
    <div className="overflow-x-auto" aria-hidden="true">
      <div
        className="flex min-w-max items-end gap-3 pb-1 sm:gap-4"
        style={{ height: CHART_HEIGHT_PX + 56 }}
      >
        {items.map((it) => {
          const amount = Number(it.total_amount) || 0
          const heightPx = max > 0
            ? Math.max(MIN_BAR_HEIGHT_PX, Math.round((amount / max) * CHART_HEIGHT_PX))
            : MIN_BAR_HEIGHT_PX
          return (
            <div key={it.month} className="flex w-14 flex-col items-center gap-1 sm:w-16">
              <div className="text-xs font-medium text-gray-700">
                <Amount value={amount} />
              </div>
              <div
                className="w-8 rounded-t bg-primary/80 transition-colors hover:bg-primary sm:w-10"
                style={{ height: `${heightPx}px` }}
                title={`${monthLabel(it.month)}: ${amount} (${it.sales_count ?? 0} sale${it.sales_count === 1 ? "" : "s"})`}
              />
              <div className="whitespace-nowrap text-xs text-gray-500">{monthLabel(it.month)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
