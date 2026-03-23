"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import ProductForm from "../../../components/ProductForm"

export default function Page() {
  const params = useParams()
  const id = params?.id
  const [initial, setInitial] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/products/${id}`)
        if (res.status === 404) {
          throw new Error('Not found')
        }
        if (!res.ok) {
          const t = await res.text()
          throw new Error(t || `Error ${res.status}`)
        }
        const data = await res.json()
        if (mounted) setInitial(data)
      } catch (e) {
        if (mounted) setError(String(e))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [id])

  if (loading) return <div className="p-6">Loading…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!initial) return <div className="p-6 text-sm text-gray-500">No data</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-primary mb-4">Edit Product</h1>
      <div className="max-w-xl">
        <div className="bg-white rounded shadow p-6">
          <ProductForm initialData={initial} endpoint={`/api/products/${id}`} method="PUT" />
        </div>
      </div>
    </div>
  )
}
