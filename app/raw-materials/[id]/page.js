"use client"
import { useEffect, useState } from "react"
import EntityForm from "../../../components/EntityForm"
import { useRouter, useParams } from "next/navigation"

export default function Page() {
  const params = useParams()
  const id = params?.id
  const router = useRouter()
  const [initial, setInitial] = useState(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/raw-products/${id}`).then((r) => r.json()).then((d) => setInitial(d)).catch(() => setInitial({}))
  }, [id])

  if (!initial) return <div className="p-6">Loading…</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Edit Raw Product</h1>
      <EntityForm
        endpoint={`/api/raw-products/${id}`}
        method="PUT"
        initialData={initial}
        fields={[
          { name: 'name', label: 'Name', required: true },
          { name: 'unit', label: 'Unit', required: true },
          { name: 'price', label: 'Price', type: 'number', required: true, min: 0 },
        ]}
        onSuccess={() => router.push('/raw-materials')}
      />
    </div>
  )
}
