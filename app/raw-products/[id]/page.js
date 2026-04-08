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

  if (loading) return <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">Loading…</div>
  if (error) return <div className="px-4 py-4 text-red-600 sm:px-6 sm:py-6 lg:px-8">{error}</div>
  if (!initialData) return <div className="px-4 py-4 text-sm text-gray-500 sm:px-6 sm:py-6 lg:px-8">No data</div>

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-primary">Edit Raw Product</h1>
      <div className="max-w-2xl rounded-lg bg-white p-4 shadow sm:p-6">
        <RawProductForm initialData={initialData} endpoint={`/api/raw-products/${id}`} method="PUT" />
      </div>
    </div>
  )
}
