"use client"
import ExpenseForm from "../../../components/ExpenseForm"
import { useRouter } from "next/navigation"

export default function NewExpensePage() {
  const router = useRouter()

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().slice(0, 10)

  async function handleSuccess() {
    // After creating an expense, return to the expenses list
    router.push(`/expenses`)
  }

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary">New Expense</h1>
      </div>
      <div className="max-w-2xl">
        <div className="rounded-lg bg-white p-4 shadow sm:p-6">
          <ExpenseForm endpoint="/api/expenses" method="POST" initialData={{ purchased_at: today }} onSuccess={handleSuccess} cancelHref="/expenses" />
        </div>
      </div>
    </div>
  )
}
