"use client"
import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ExpenseForm from "../../../components/ExpenseForm"
import ConfirmDialog from "../../../components/ConfirmDialog"
import Amount from "../../../components/Amount"
import Link from "next/link"

export default function ExpenseDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)
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

  function handleUpdateSuccess(body) {
    // After updating an expense, return to the list
    router.push('/expenses')
  }

  if (loading) return <div className="p-6">Loading…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!item) return <div className="p-6 text-sm text-gray-500">Not found</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-primary">Expense</h1>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white rounded shadow p-6">
          <ExpenseForm endpoint={`/api/expenses/${id}`} method="PUT" initialData={item} onSuccess={handleUpdateSuccess} cancelHref={`/expenses`} />
        </div>
      </div>

      <ConfirmDialog open={confirmOpen} title="Delete expense" onCancel={() => setConfirmOpen(false)} onConfirm={handleDelete}>
        Are you sure you want to delete this expense?
      </ConfirmDialog>
    </div>
  )
}
