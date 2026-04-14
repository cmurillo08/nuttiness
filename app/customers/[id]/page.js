"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import CustomerForm from "../../../components/CustomerForm"

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
        const res = await fetch(`/api/customers/${id}`)
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
    <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-primary">Edit Customer</h1>
      <div className="max-w-2xl">
        <div className="rounded-lg bg-white p-4 shadow sm:p-6">
          <CustomerForm initialData={initial} endpoint={`/api/customers/${id}`} method="PUT" />
        </div>
      </div>
    </div>
  )
}
