"use client"
import OrderBuilder from "../../../components/OrderBuilder"
import { useState } from "react"

export default function Page() {
  const [success, setSuccess] = useState(null)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">New Sale / Order</h1>
      <OrderBuilder onSuccess={(body) => setSuccess(body)} />
      {success && <div className="mt-4 text-green-600">Order created (id: {String(success.id || success.order_id || '')})</div>}
    </div>
  )
}
