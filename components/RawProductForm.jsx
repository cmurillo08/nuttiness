"use client"
import { useRouter } from "next/navigation"
import EntityForm from "./EntityForm"

export default function RawProductForm({ endpoint = "/api/raw-products", method = "POST", initialData = {}, onSuccess }) {
  const router = useRouter()

  function handleSuccess(body) {
    if (onSuccess) return onSuccess(body)
    router.push("/raw-products")
  }

  const fields = [
    { name: "name", label: "Name", required: true },
    { name: "unit", label: "Unit", required: true, hint: "e.g., kg, each" },
    { name: "unit_price", label: "Unit Price (CRC)", type: "number", required: true, min: 0, step: "0.0001" },
    { name: "unit_size", label: "Unit Size", type: "number", required: true, min: 0, step: "0.0001" },
    { name: "supplier", label: "Supplier" },
    { name: "notes", label: "Notes", type: "textarea" },
  ]

  return <EntityForm endpoint={endpoint} method={method} initialData={initialData} fields={fields} onSuccess={handleSuccess} />
}
