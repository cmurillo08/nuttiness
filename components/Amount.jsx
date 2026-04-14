export default function Amount({ value }) {
  const v = Number(value) || 0
  return (
    <span className="font-medium">₡{v.toFixed(2)}</span>
  )
}
