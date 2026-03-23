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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-11/12 max-w-lg p-4">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <div className="mb-4 text-sm text-gray-700 dark:text-gray-200">{children}</div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1 rounded bg-gray-200">Cancel</button>
          <button onClick={onConfirm} className="px-3 py-1 rounded bg-red-500 text-white">Confirm</button>
        </div>
      </div>
    </div>
  )
}
