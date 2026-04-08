"use client"
import { useEffect, useState } from "react"
import Amount from "../../components/Amount"

export default function ReportsPage() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchReport() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/reports/summary")
        if (!res.ok) throw new Error(`Failed to load report: ${res.status}`)
        const data = await res.json()
        setReport(data)
      } catch (err) {
        setError(String(err))
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [])

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const getProfitColor = (profit) => {
    if (profit > 0) return 'text-green-600'
    if (profit < 0) return 'text-red-600'
    return 'text-amber-600'
  }

  return (
    <div className="space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary">Reports</h1>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="text-gray-600">Loading…</div>
        </div>
      )}

      {error && (
        <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          {error}
        </div>
      )}

      {!loading && report && (
        <div className="mx-auto w-full max-w-4xl">
          <h2 className="text-xl font-semibold text-primary mb-6">Financial Summary</h2>
          
          <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Total Expenses */}
            <div className="rounded-lg border-2 border-red-200 bg-red-50 p-5 sm:p-6">
              <div className="text-sm font-medium text-red-900 mb-2">Total Expenses</div>
              <div className="text-2xl font-bold text-red-900 sm:text-3xl">
                <Amount value={report.total_expenses_amount || 0} />
              </div>
            </div>

            {/* Total Sales */}
            <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-5 sm:p-6">
              <div className="text-sm font-medium text-amber-900 mb-2">Total Sales</div>
              <div className="text-2xl font-bold text-amber-900 sm:text-3xl">
                <Amount value={report.total_sales_amount || 0} />
              </div>
            </div>

            {/* Historical Profit */}
            <div className={`rounded-lg border-2 border-green-200 bg-green-50 p-5 sm:p-6`}>
              <div className="text-sm font-medium text-green-900 mb-2">Historical Profit</div>
              <div className={`text-2xl font-bold sm:text-3xl ${getProfitColor(report.historical_profit || 0)}`}>
                <Amount value={report.historical_profit || 0} />
              </div>
              {(report.historical_profit || 0) <= 0 && (
                <div className="text-xs text-amber-600 mt-2">
                  {(report.historical_profit || 0) < 0 ? 'Loss' : 'No profit'}
                </div>
              )}
            </div>
          </div>

          {/* Generated At */}
          {report.generated_at && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600">
                Report generated at: <span className="font-medium">{formatDate(report.generated_at)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && !report && !error && (
        <div className="text-center py-12">
          <div className="text-gray-500">No report data available</div>
        </div>
      )}
    </div>
  )
}
