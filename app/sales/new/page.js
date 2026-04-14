"use client"
import OrderBuilder from "../../../components/OrderBuilder"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function Page() {
  const [success, setSuccess] = useState(null)
  const router = useRouter()

  function handleCancel() {
    router.back()
  }

  function handleSuccess(body) {
    setSuccess(body)
    const id = body && (body.id || body.order_id)
    if (id) router.push(`/sales/${id}`)
  }

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-primary">New Sale / Order</h1>
        <button onClick={handleCancel} className="min-h-11 rounded-md border border-primary bg-white px-4 py-2 text-primary hover:bg-primary/5 sm:w-auto">Cancel</button>
      </div>
      <OrderBuilder onSuccess={handleSuccess} />
      {success && <div className="mt-4 text-green-600">Order created (id: {String(success.id || success.order_id || '')})</div>}
    </div>
  )
}
