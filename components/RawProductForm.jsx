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
    { name: "unit", label: "Unit Size", required: true, hint: "e.g., 910g" },
    { name: "price", label: "Price (CRC)", type: "number", required: true, min: 0, step: "0.01" },
    { name: "supplier", label: "Supplier" },
  ]

  return <EntityForm endpoint={endpoint} method={method} initialData={initialData} fields={fields} onSuccess={handleSuccess} />
}
