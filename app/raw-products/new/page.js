import RawProductForm from "../../../components/RawProductForm"

export default function Page() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4 text-primary">New Raw Product</h1>
      <div className="max-w-xl">
        <RawProductForm />
      </div>
    </div>
  )
}
