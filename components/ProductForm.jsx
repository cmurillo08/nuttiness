"use client"
import { useRouter } from "next/navigation"
import EntityForm from "./EntityForm"

export default function ProductForm({ endpoint = "/api/products", method = "POST", initialData = {}, onSuccess }) {
  const router = useRouter()

  function handleSuccess(body) {
    if (onSuccess) return onSuccess(body)
    router.push("/products")
  }

  const fields = [
    { name: "name", label: "Name", required: true },
    { name: "unit", label: "Unit", required: true, hint: "e.g., each, portion" },
    { name: "price", label: "Price (CRC)", type: "number", required: true, min: 0, step: "0.0001" },
    { name: "cost_price", label: "Cost Price (CRC)", type: "number", required: false, min: 0, step: "0.0001" },
    { name: "recipe_notes", label: "Recipe Notes", type: "textarea" },
  ]

  return <EntityForm endpoint={endpoint} method={method} initialData={initialData} fields={fields} onSuccess={handleSuccess} />
}
