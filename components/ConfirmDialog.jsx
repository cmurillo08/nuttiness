"use client"
import { useEffect } from "react"

export default function ConfirmDialog({ open, title = "Confirm", children, onCancel, onConfirm }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && open) onCancel && onCancel()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onCancel])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-md p-6">
        <h3 className="text-lg font-semibold text-primary mb-3">{title}</h3>
        <div className="mb-6 text-sm text-gray-700">{children}</div>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-medium">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors font-medium">Confirm</button>
        </div>
      </div>
    </div>
  )
}
