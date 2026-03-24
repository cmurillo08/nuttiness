"use client"
import { useRouter } from "next/navigation"
import EntityForm from "./EntityForm"

export default function CustomerForm({ endpoint = "/api/customers", method = "POST", initialData = {}, onSuccess }) {
  const router = useRouter()

  function handleSuccess(body) {
    if (onSuccess) return onSuccess(body)
    router.push("/customers")
    router.refresh()
  }

  const fields = [
    { name: "name", label: "Name", required: true },
    { name: "phone", label: "Phone", placeholder: "+506 1234 5678" },
    { name: "notes", label: "Notes", type: "textarea" },
  ]

  return <EntityForm endpoint={endpoint} method={method} initialData={initialData} fields={fields} onSuccess={handleSuccess} />
}
