"use client"
import { useEffect, useState } from "react"
import Link from "next/link"

export default function Page() {
  const [stats, setStats] = useState({ products: 0, rawProducts: 0, expenses: 0, sales: 0, customers: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/stats")
        if (!res.ok) throw new Error(`Failed to load stats: ${res.status}`)
        const data = await res.json()
        setStats(data)
      } catch (err) {
        setError(String(err))
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const cards = [
    { title: "Sales", count: stats.sales, href: "/sales", bgColor: "bg-amber-50", textColor: "text-amber-900", borderColor: "border-amber-200" },
    { title: "Expenses", count: stats.expenses, href: "/expenses", bgColor: "bg-red-50", textColor: "text-red-900", borderColor: "border-red-200" },
    { title: "Customers", count: stats.customers, href: "/customers", bgColor: "bg-purple-50", textColor: "text-purple-900", borderColor: "border-purple-200" },
    { title: "Raw Products", count: stats.rawProducts, href: "/raw-products", bgColor: "bg-green-50", textColor: "text-green-900", borderColor: "border-green-200" },
    { title: "Products", count: stats.products, href: "/products", bgColor: "bg-blue-50", textColor: "text-blue-900", borderColor: "border-blue-200" },
  ]

  return (
    <div>
      <div className="text-primary px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/nuttiness-logo.png" alt="Nuttiness" className="h-42 w-42 object-contain" />
          <div>
            <h1 className="text-3xl font-bold">Nuttiness</h1>
            <p className="text-lg text-primary/80">Sabor que Enloquece</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-0">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-primary mb-4">Statistics</h2>
          {loading && <div>Loading…</div>}
          {error && <div className="text-red-600">{error}</div>}
          {!loading && (
            <div className="flex flex-col gap-4">
              {cards.map((card) => (
                <Link key={card.title} href={card.href}>
                  <div className={`${card.bgColor} border-2 ${card.borderColor} rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`text-sm font-medium ${card.textColor}`}>{card.title}</div>
                        <div className={`text-3xl font-bold ${card.textColor}`}>{card.count}</div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
