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
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-primary">New Sale / Order</h1>
        <button onClick={handleCancel} className="px-3 py-2 border border-primary text-primary bg-white hover:bg-primary/5 rounded-md">Cancel</button>
      </div>
      <OrderBuilder onSuccess={handleSuccess} />
      {success && <div className="mt-4 text-green-600">Order created (id: {String(success.id || success.order_id || '')})</div>}
    </div>
  )
}
