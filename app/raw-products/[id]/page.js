"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import RawProductForm from "../../../components/RawProductForm"

export default function Page() {
  const params = useParams()
  const id = params?.id
  const [initialData, setInitialData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/raw-products/${id}`)
        if (res.status === 404) {
          throw new Error('Not found')
        }
        if (!res.ok) {
          const t = await res.text()
          throw new Error(t || `Error ${res.status}`)
        }
        const data = await res.json()
        if (mounted) setInitialData(data)
      } catch (e) {
        if (mounted) setError(String(e))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [id])

  if (loading) return <div>Loading…</div>
  if (error) return <div className="text-red-600">{error}</div>
  if (!initialData) return <div className="text-sm text-gray-500">No data</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4 text-primary">Edit Raw Product</h1>
      <div className="max-w-xl">
        <RawProductForm initialData={initialData} endpoint={`/api/raw-products/${id}`} method="PUT" />
      </div>
    </div>
  )
}
