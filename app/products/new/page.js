"use client"
import EntityForm from "../../../components/EntityForm"
import { useRouter } from "next/navigation"

export default function Page() {
  const router = useRouter()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">New Product</h1>
      <EntityForm
        endpoint="/api/products"
        method="POST"
        fields={[
          { name: 'name', label: 'Name', required: true },
          { name: 'price', label: 'Price', type: 'number', required: true, min: 0 },
          { name: 'recipe', label: 'Recipe (json array)', type: 'textarea', hint: 'JSON array of raw_product_id and qty' },
        ]}
        onSuccess={() => router.push('/products')}
      />
    </div>
  )
}
