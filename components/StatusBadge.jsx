export default function StatusBadge({ status }) {
  const statusConfig = {
    prepared: {
      bgColor: "bg-blue-50",
      textColor: "text-blue-900",
      borderColor: "border-blue-200",
    },
    delivered: {
      bgColor: "bg-green-50",
      textColor: "text-green-900",
      borderColor: "border-green-200",
    },
    paid: {
      bgColor: "bg-amber-50",
      textColor: "text-amber-900",
      borderColor: "border-amber-200",
    },
    cancelled: {
      bgColor: "bg-red-50",
      textColor: "text-red-900",
      borderColor: "border-red-200",
    },
  }

  const config = statusConfig[status] || statusConfig.prepared

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}>
      {status}
    </span>
  )
}
