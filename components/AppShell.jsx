"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

const SHELL_SECTIONS = [
  { href: "/sales", label: "Sales", icon: SalesIcon },
  { href: "/expenses", label: "Expenses", icon: ExpensesIcon },
  { href: "/raw-products", label: "Raw Products", icon: RawProductsIcon },
  { href: "/products", label: "Products", icon: ProductsIcon },
  { href: "/customers", label: "Customers", icon: CustomersIcon },
  { href: "/reports", label: "Reports", icon: ReportsIcon },
]

function matchesSection(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function shouldRenderShell(pathname) {
  return SHELL_SECTIONS.some((section) => matchesSection(pathname, section.href))
}

function SidebarNavItem({ href, label, icon: Icon, active, collapsed }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60",
        collapsed ? "justify-center px-2" : "justify-start",
        active
          ? "bg-primary text-white shadow-sm"
          : "text-slate-700 hover:bg-white hover:text-primary",
      ].join(" ")}
      title={collapsed ? label : undefined}
    >
      <span className={active ? "text-white" : "text-primary"}>
        <Icon className="h-5 w-5 shrink-0" />
      </span>
      {!collapsed && <span className="truncate">{label}</span>}
      {collapsed && <span className="sr-only">{label}</span>}
    </Link>
  )
}

export default function AppShell({ children }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)")
    const syncCollapsedState = () => setCollapsed(mediaQuery.matches)

    syncCollapsedState()

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", syncCollapsedState)
      return () => mediaQuery.removeEventListener("change", syncCollapsedState)
    }

    mediaQuery.addListener(syncCollapsedState)
    return () => mediaQuery.removeListener(syncCollapsedState)
  }, [])

  if (!shouldRenderShell(pathname)) {
    return children
  }

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside
          className={[
            "border-r border-stone-200 bg-[#f6efe1] transition-all duration-200",
            collapsed ? "w-20" : "w-72",
          ].join(" ")}
        >
          <div className="sticky top-0 flex h-screen flex-col px-3 py-4">
            <Link
              href="/sales"
              className={[
                "mb-6 flex items-center rounded-3xl border border-white/70 bg-white/70 px-3 py-3 shadow-sm transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60",
                collapsed ? "justify-center" : "gap-3",
              ].join(" ")}
              aria-label="Nuttiness home"
              title={collapsed ? "Nuttiness" : undefined}
            >
              <img src="/nuttiness-logo.png" alt="Nuttiness" className="h-10 w-10 shrink-0 object-contain" />
              {!collapsed && (
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-primary">Nuttiness</div>
                  <div className="truncate text-xs text-primary/70">Sabor que Enloquece</div>
                </div>
              )}
            </Link>

            <nav className="flex-1 space-y-2" aria-label="Primary">
              {SHELL_SECTIONS.map((section) => (
                <SidebarNavItem
                  key={section.href}
                  href={section.href}
                  label={section.label}
                  icon={section.icon}
                  active={matchesSection(pathname, section.href)}
                  collapsed={collapsed}
                />
              ))}
            </nav>

            <button
              type="button"
              onClick={() => setCollapsed((current) => !current)}
              className={[
                "mt-4 flex items-center rounded-2xl border border-stone-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-secondary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60",
                collapsed ? "justify-center" : "justify-between gap-3",
              ].join(" ")}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <span className="text-primary">
                <CollapseIcon className="h-5 w-5" collapsed={collapsed} />
              </span>
              {!collapsed && <span>{collapsed ? "Expand" : "Collapse"}</span>}
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="min-h-screen">{children}</div>
        </main>
      </div>
    </div>
  )
}

function IconBase({ className, children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function SalesIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M4 19h16" />
      <path d="M7 15l3-3 3 2 4-5" />
      <path d="M17 9h3v3" />
    </IconBase>
  )
}

function ExpensesIcon({ className }) {
  return (
    <IconBase className={className}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 10h16" />
      <path d="M8 15h3" />
    </IconBase>
  )
}

function RawProductsIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M12 3l7 4-7 4-7-4 7-4Z" />
      <path d="M5 7v6l7 4 7-4V7" />
    </IconBase>
  )
}

function ProductsIcon({ className }) {
  return (
    <IconBase className={className}>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </IconBase>
  )
}

function CustomersIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M16 19a4 4 0 0 0-8 0" />
      <circle cx="12" cy="11" r="3" />
      <path d="M19 19a3 3 0 0 0-2.4-2.93" />
      <path d="M7.4 16.07A3 3 0 0 0 5 19" />
    </IconBase>
  )
}

function ReportsIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M6 20V10" />
      <path d="M12 20V4" />
      <path d="M18 20v-7" />
    </IconBase>
  )
}

function CollapseIcon({ className, collapsed }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 12h16" />
      {collapsed ? <path d="m11 7 5 5-5 5" /> : <path d="m13 7-5 5 5 5" />}
    </svg>
  )
}