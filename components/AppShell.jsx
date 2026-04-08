"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"

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

function SidebarNavItem({ href, label, icon: Icon, active, collapsed, onNavigate }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
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
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [prevPathname, setPrevPathname] = useState(pathname)

  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setMobileMenuOpen(false)
  }

  async function handleLogout() {
    if (loggingOut) return

    setLoggingOut(true)

    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } finally {
      setMobileMenuOpen(false)
      router.push("/login")
      router.refresh()
      setLoggingOut(false)
    }
  }

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return children
  }

  if (!shouldRenderShell(pathname)) {
    return children
  }

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <div className="flex min-h-screen">
        <div className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-stone-200 bg-[#f6efe1] px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/70 bg-white text-primary shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60"
            aria-label="Open navigation"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <Link href="/sales" className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-3 py-1.5">
            <Image src="/nuttiness-logo.png" alt="Nuttiness" width={28} height={28} className="h-7 w-7 object-contain" />
            <span className="text-sm font-semibold text-primary">Nuttiness</span>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation"
          className={[
            "fixed inset-0 z-40 bg-slate-900/40 transition-opacity lg:hidden",
            mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0",
          ].join(" ")}
        />

        <aside
          className={[
            "fixed inset-y-0 left-0 z-50 w-72 border-r border-stone-200 bg-[#f6efe1] transition-transform duration-200 lg:hidden",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <div className="sticky top-0 flex h-screen flex-col px-3 py-4">
            <Link
              href="/sales"
              className="mb-6 flex items-center gap-3 rounded-3xl border border-white/70 bg-white/70 px-3 py-3 shadow-sm transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60"
              aria-label="Nuttiness home"
            >
              <Image src="/nuttiness-logo.png" alt="Nuttiness" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" />
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-primary">Nuttiness</div>
                <div className="truncate text-xs text-primary/70">Sabor que Enloquece</div>
              </div>
            </Link>

            <nav className="flex-1 space-y-2" aria-label="Primary">
              {SHELL_SECTIONS.map((section) => (
                <SidebarNavItem
                  key={section.href}
                  href={section.href}
                  label={section.label}
                  icon={section.icon}
                  active={matchesSection(pathname, section.href)}
                  collapsed={false}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              ))}
            </nav>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className={[
                "mt-4 flex items-center rounded-2xl border border-stone-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-secondary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60",
                "justify-center",
              ].join(" ")}
              aria-label="Close sidebar"
            >
              <span className="text-primary">
                <CloseIcon className="h-5 w-5" />
              </span>
              <span>Close</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-2 flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-secondary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="text-primary">
                <LogoutIcon className="h-5 w-5" />
              </span>
              <span>{loggingOut ? "Signing out..." : "Logout"}</span>
            </button>
          </div>
        </aside>

        <aside
          className={[
            "hidden border-r border-stone-200 bg-[#f6efe1] transition-all duration-200 lg:block",
            collapsed ? "lg:w-20" : "lg:w-72",
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
              <Image src="/nuttiness-logo.png" alt="Nuttiness" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" />
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

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className={[
                "mt-2 flex items-center rounded-2xl border border-stone-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-secondary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 disabled:cursor-not-allowed disabled:opacity-60",
                collapsed ? "justify-center" : "justify-start gap-3",
              ].join(" ")}
              aria-label="Logout"
              title={collapsed ? "Logout" : undefined}
            >
              <span className="text-primary">
                <LogoutIcon className="h-5 w-5" />
              </span>
              {!collapsed && <span>{loggingOut ? "Signing out..." : "Logout"}</span>}
              {collapsed && <span className="sr-only">Logout</span>}
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pt-16 lg:pt-0">
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

function MenuIcon({ className }) {
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
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  )
}

function LogoutIcon({ className }) {
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
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

function CloseIcon({ className }) {
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
      <path d="M6 6l12 12" />
      <path d="m18 6-12 12" />
    </svg>
  )
}
