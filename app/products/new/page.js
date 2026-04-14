import ProductForm from "../../../components/ProductForm"

export default function Page() {
  return (
    <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-primary">New Product</h1>
      <div className="max-w-2xl">
        <div className="rounded-lg bg-white p-4 shadow sm:p-6">
          <ProductForm />
        </div>
      </div>
    </div>
  )
}
