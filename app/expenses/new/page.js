"use client"
import EntityForm from "../../../components/EntityForm"
import { useRouter } from "next/navigation"

export default function Page() {
  const router = useRouter()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">New Expense</h1>
      <EntityForm
        endpoint="/api/expenses"
        method="POST"
        fields={[
          { name: 'description', label: 'Description', required: true },
          { name: 'amount', label: 'Amount', type: 'number', required: true, min: 0 },
        ]}
        onSuccess={() => router.push('/expenses')}
      />
    </div>
  )
}
