"use client"
import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ExpenseForm from "../../../components/ExpenseForm"
import ConfirmDialog from "../../../components/ConfirmDialog"

export default function ExpenseDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    async function fetchItem() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/expenses/${id}`)
        if (!res.ok) throw new Error(`Failed to load expense: ${res.status}`)
        const data = await res.json()
        if (mounted) setItem(data)
      } catch (err) {
        if (mounted) setError(String(err))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    if (id) fetchItem()
    return () => { mounted = false }
  }, [id])

  async function handleDelete() {
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
      router.push("/expenses")
    } catch (err) {
      setError(String(err))
    } finally {
      setConfirmOpen(false)
    }
  }

  function handleUpdateSuccess() {
    // After updating an expense, return to the list
    router.push('/expenses')
  }

  if (loading) return <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">Loading…</div>
  if (error) return <div className="px-4 py-4 text-red-600 sm:px-6 sm:py-6 lg:px-8">{error}</div>
  if (!item) return <div className="px-4 py-4 text-sm text-gray-500 sm:px-6 sm:py-6 lg:px-8">Not found</div>

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary">Expense</h1>
      </div>

      <div className="max-w-2xl">
        <div className="rounded-lg bg-white p-4 shadow sm:p-6">
          <ExpenseForm endpoint={`/api/expenses/${id}`} method="PUT" initialData={item} onSuccess={handleUpdateSuccess} cancelHref={`/expenses`} />
        </div>
      </div>

      <ConfirmDialog open={confirmOpen} title="Delete expense" onCancel={() => setConfirmOpen(false)} onConfirm={handleDelete}>
        Are you sure you want to delete this expense?
      </ConfirmDialog>
    </div>
  )
}
