"use client"
import { useEffect, useState } from "react"
import OrderBuilder from "../../../components/OrderBuilder"
import { useParams } from "next/navigation"

export default function Page() {
  const params = useParams()
  const id = params?.id
  const [initial, setInitial] = useState(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/sales/${id}`).then((r) => r.json()).then((d) => setInitial(d)).catch(() => setInitial(null))
  }, [id])

  if (!initial) return <div className="p-6">Loading…</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Order {id}</h1>
      <div className="mb-4">Order details from server:</div>
      <pre className="p-2 bg-gray-100 rounded text-sm">{JSON.stringify(initial, null, 2)}</pre>
      <div className="mt-4">
        <h2 className="text-lg font-semibold">Rebuild / Edit</h2>
        <OrderBuilder onSuccess={() => {}} />
      </div>
    </div>
  )
}
