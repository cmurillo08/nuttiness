"use client"
import { useEffect, useRef, useState } from "react"

export default function CustomerSelect({ value, onChange, placeholder = "Select a customer" }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newCustomerName, setNewCustomerName] = useState("")
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [filterText, setFilterText] = useState("")
  const [selectOpen, setSelectOpen] = useState(false)
  const dropdownRef = useRef(null)
  const inputRef = useRef(null)

  const extractCustomers = (data) => {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.items)) return data.items
    if (Array.isArray(data?.customers)) return data.customers
    if (Array.isArray(data?.data)) return data.data
    return []
  }

  useEffect(() => {
    let mounted = true
    async function fetchItems() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/customers?limit=100&offset=0")
        if (!res.ok) throw new Error(`Failed to load customers: ${res.status}`)
        const data = await res.json()
        const customersList = extractCustomers(data)
        if (mounted) setItems(customersList)
      } catch (err) {
        setError(String(err))
      } finally {
        setLoading(false)
      }
    }
    fetchItems()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSelectOpen(false)
      }
    }
    if (selectOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [selectOpen])

  const selectedCustomer = items.find(c => c.id === value)
  const filteredItems = items.filter(c => c.name.toLowerCase().includes(filterText.toLowerCase()))

  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) {
      setError("Please enter a customer name")
      return
    }

    setCreatingCustomer(true)
    setError(null)
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCustomerName })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || `Failed to create customer: ${res.status}`)
        return
      }
      // Refresh list and select the new customer
      const updatedRes = await fetch("/api/customers?limit=100&offset=0")
      const updatedData = await updatedRes.json()
      const customersList = extractCustomers(updatedData)
      setItems(customersList)
      onChange && onChange(data.id)
      setNewCustomerName("")
      setSelectOpen(false)
      setFilterText("")
    } catch (err) {
      setError(String(err))
    } finally {
      setCreatingCustomer(false)
    }
  }

  return (
    <div className="w-full space-y-2">
      {error && <div className="text-red-600 text-sm">{error}</div>}
      
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setSelectOpen(!selectOpen)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-left focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
        >
          <div className="flex items-center justify-between">
            <span className={selectedCustomer ? "text-gray-900" : "text-gray-500"}>
              {selectedCustomer ? selectedCustomer.name : placeholder}
            </span>
            <svg className={`w-4 h-4 transition-transform ${selectOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </button>

        {selectOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg">
            <div className="p-2 border-b border-gray-200">
              <input
                ref={inputRef}
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Search customers..."
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                autoFocus
              />
            </div>

            <div className="max-h-60 overflow-y-auto">
              {loading ? (
                <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
              ) : filteredItems.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No customers found</div>
              ) : (
                filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChange && onChange(item.id)
                      setSelectOpen(false)
                      setFilterText("")
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${value === item.id ? "bg-blue-50 text-blue-900" : ""}`}
                  >
                    {item.name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={newCustomerName}
          onChange={(e) => setNewCustomerName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreateCustomer()}
          placeholder="Or create new customer..."
          className="min-h-11 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          onClick={handleCreateCustomer}
          disabled={creatingCustomer || !newCustomerName.trim()}
          className="min-h-11 rounded-md bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-60 hover:bg-blue-700 sm:w-auto"
        >
          {creatingCustomer ? "Creating..." : "Add"}
        </button>
      </div>
    </div>
  )
}
