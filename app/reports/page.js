"use client"
import { useEffect, useState } from "react"
import Amount from "../../components/Amount"
import MonthlySalesChart from "../../components/MonthlySalesChart"

function useReportFetch(url) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Failed to load report: ${res.status}`)
        const body = await res.json()
        if (mounted) setData(body)
      } catch (err) {
        if (mounted) setError(String(err.message ?? err))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [url])

  return { data, loading, error }
}

function ReportSection({ title, caption, loading, error, empty, children }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-primary sm:text-xl">{title}</h2>
        {caption && <div className="text-xs text-gray-500">{caption}</div>}
      </div>
      {loading && <div className="py-6 text-center text-sm text-gray-600">Loading…</div>}
      {!loading && error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}
      {!loading && !error && empty && (
        <div className="py-6 text-center text-sm text-gray-500">{empty}</div>
      )}
      {!loading && !error && !empty && children}
    </section>
  )
}

function TopProductsSection() {
  const { data, loading, error } = useReportFetch("/api/reports/top-products?limit=5")
  const items = Array.isArray(data?.items) ? data.items : []

  return (
    <ReportSection
      title="Top Products"
      caption="Based on paid sales."
      loading={loading}
      error={error}
      empty={!loading && !error && items.length === 0 ? "No paid sales yet" : null}
    >
      <div className="space-y-3 lg:hidden">
        {items.map((it, idx) => (
          <div key={it.prepared_product_id} className="rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium text-slate-900">
                #{idx + 1} {it.product_name}{it.unit ? ` - ${it.unit}` : ""}
              </div>
            </div>
            <div className="mt-1 flex justify-between text-sm text-gray-600">
              <span>{it.total_quantity} units sold</span>
              <span className="font-medium text-slate-900"><Amount value={it.total_amount} /></span>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden lg:block">
        <table className="min-w-full table-auto divide-y divide-gray-100">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-sm font-medium text-primary">Rank</th>
              <th className="px-3 py-2 text-left text-sm font-medium text-primary">Product</th>
              <th className="px-3 py-2 text-left text-sm font-medium text-primary">Units Sold</th>
              <th className="px-3 py-2 text-left text-sm font-medium text-primary">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((it, idx) => (
              <tr key={it.prepared_product_id}>
                <td className="px-3 py-2 text-sm">{idx + 1}</td>
                <td className="px-3 py-2 text-sm">{it.product_name}{it.unit ? ` - ${it.unit}` : ""}</td>
                <td className="px-3 py-2 text-sm">{it.total_quantity}</td>
                <td className="px-3 py-2 text-sm"><Amount value={it.total_amount} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportSection>
  )
}

function TopCustomersSection() {
  const { data, loading, error } = useReportFetch("/api/reports/top-customers?limit=5")
  const items = Array.isArray(data?.items) ? data.items : []

  return (
    <ReportSection
      title="Top Customers"
      caption="Based on paid sales."
      loading={loading}
      error={error}
      empty={!loading && !error && items.length === 0 ? "No paid sales yet" : null}
    >
      <div className="space-y-3 lg:hidden">
        {items.map((it, idx) => (
          <div key={it.customer_id} className="rounded-lg border border-gray-200 p-3">
            <div className="font-medium text-slate-900">#{idx + 1} {it.customer_name}</div>
            <div className="mt-1 flex flex-wrap justify-between gap-1 text-sm text-gray-600">
              <span>{it.total_quantity} units · {it.order_count} orders</span>
              <span className="font-medium text-slate-900"><Amount value={it.total_amount} /></span>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden lg:block">
        <table className="min-w-full table-auto divide-y divide-gray-100">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-sm font-medium text-primary">Rank</th>
              <th className="px-3 py-2 text-left text-sm font-medium text-primary">Customer</th>
              <th className="px-3 py-2 text-left text-sm font-medium text-primary">Units Purchased</th>
              <th className="px-3 py-2 text-left text-sm font-medium text-primary">Orders</th>
              <th className="px-3 py-2 text-left text-sm font-medium text-primary">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((it, idx) => (
              <tr key={it.customer_id}>
                <td className="px-3 py-2 text-sm">{idx + 1}</td>
                <td className="px-3 py-2 text-sm">{it.customer_name}</td>
                <td className="px-3 py-2 text-sm">{it.total_quantity}</td>
                <td className="px-3 py-2 text-sm">{it.order_count}</td>
                <td className="px-3 py-2 text-sm"><Amount value={it.total_amount} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportSection>
  )
}

function SalesPerMonthSection() {
  const { data, loading, error } = useReportFetch("/api/reports/sales-monthly?months=12")
  const items = Array.isArray(data?.items) ? data.items : []

  return (
    <ReportSection
      title="Sales per Month"
      caption="Paid sales, last 12 months (UTC months)."
      loading={loading}
      error={error}
      empty={!loading && !error && items.every((it) => Number(it.sales_count) === 0) ? "No paid sales yet" : null}
    >
      <figure>
        <MonthlySalesChart items={items} />
        <table className="sr-only">
          <caption>Monthly paid sales totals and sale counts</caption>
          <thead>
            <tr>
              <th>Month</th>
              <th>Total Amount</th>
              <th>Sales Count</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.month}>
                <td>{it.month}</td>
                <td>{it.total_amount}</td>
                <td>{it.sales_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    </ReportSection>
  )
}

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

      <div className="mx-auto w-full max-w-4xl space-y-6">
        <TopProductsSection />
        <TopCustomersSection />
        <SalesPerMonthSection />
      </div>
    </div>
  )
}
