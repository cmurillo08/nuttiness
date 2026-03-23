"use client"
import ExpenseForm from "../../../components/ExpenseForm"
import { useRouter } from "next/navigation"

export default function NewExpensePage() {
  const router = useRouter()

  async function handleSuccess(body) {
    // After creating an expense, return to the expenses list
    router.push(`/expenses`)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-primary">New Expense</h1>
      </div>
      <div className="max-w-2xl">
        <div className="bg-white rounded shadow p-6">
          <ExpenseForm endpoint="/api/expenses" method="POST" onSuccess={handleSuccess} cancelHref="/expenses" />
        </div>
      </div>
    </div>
  )
}
