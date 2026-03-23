import ProductForm from "../../../components/ProductForm"

export default function Page() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-primary">New Product</h1>
      <div className="max-w-xl">
        <div className="bg-white rounded shadow p-6">
          <ProductForm />
        </div>
      </div>
    </div>
  )
}
