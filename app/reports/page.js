"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" title="Back to Dashboard" className="hover:opacity-80 transition-opacity">
            <img src="/nuttiness-logo.png" alt="Dashboard" className="h-12 w-12 object-contain" />
          </Link>
          <h1 className="text-2xl font-semibold text-primary">Reports</h1>
        </div>
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
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-primary mb-6">Financial Summary</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Total Expenses */}
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
              <div className="text-sm font-medium text-red-900 mb-2">Total Expenses</div>
              <div className="text-3xl font-bold text-red-900">
                <Amount value={report.total_expenses_amount || 0} />
              </div>
            </div>

            {/* Total Sales */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-6">
              <div className="text-sm font-medium text-amber-900 mb-2">Total Sales</div>
              <div className="text-3xl font-bold text-amber-900">
                <Amount value={report.total_sales_amount || 0} />
              </div>
            </div>

            {/* Historical Profit */}
            <div className={`bg-green-50 border-2 border-green-200 rounded-lg p-6`}>
              <div className="text-sm font-medium text-green-900 mb-2">Historical Profit</div>
              <div className={`text-3xl font-bold ${getProfitColor(report.historical_profit || 0)}`}>
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
