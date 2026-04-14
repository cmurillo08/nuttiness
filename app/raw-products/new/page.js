import RawProductForm from "../../../components/RawProductForm"

export default function Page() {
  return (
    <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-primary">New Raw Product</h1>
      <div className="max-w-2xl rounded-lg bg-white p-4 shadow sm:p-6">
        <RawProductForm />
      </div>
    </div>
  )
}
