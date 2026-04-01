# Phase 8 Frontend Design Note

## Summary
Phase 8 replaces the dashboard-as-home pattern with a shared left sidebar shell used across the operational app. The frontend scope is navigation, layout, branding, and route-entry behavior only; no business logic, domain rules, or data semantics change.

## Pages/routes affected
### Entry routes
- `/` → redirect to the default operational page (`/sales` recommended by the approved plan)
- `/dashboard` → legacy redirect to `/sales`

### Primary shell routes
Apply the shared shell to these primary sections:
- `/sales`
- `/expenses`
- `/raw-products`
- `/products`
- `/customers`
- `/reports`

### Child routes that should inherit the shell for consistency
- `/sales/new`
- `/sales/[id]`
- `/expenses/new`
- `/expenses/[id]`
- `/raw-products/new`
- `/raw-products/[id]`
- `/products/new`
- `/products/[id]`
- `/customers/new`
- `/customers/[id]`

## Components to add/update
### Add
- `AppShell` — shared application frame with left sidebar and main content region
- `SidebarNav` — ordered section navigation for Sales, Expenses, Raw Products, Products, Customers, Reports
- `SidebarBrand` — brand/logo area at the top of the sidebar
- `SidebarNavItem` — icon + label item with active-state treatment
- `SidebarCollapseToggle` — simple collapse/expand affordance for narrower screens

### Update
- Root route handling to use the new default destination instead of the dashboard
- Legacy dashboard route to redirect rather than render dashboard cards
- Existing section list pages to remove header-level “Back to Dashboard” logo links once sidebar navigation is present
- Existing new/edit/detail pages to render inside the shell rather than as isolated pages

## UI structure/layout description
- Persistent left sidebar on larger screens with:
  - brand block at top
  - primary nav items in operational order: Sales, Expenses, Raw Products, Products, Customers, Reports
  - collapse control near the bottom
- Main content area to the right with page-specific headers, actions, tables, forms, and detail views unchanged in purpose
- Active route highlighting should clearly identify the current section
- On narrower screens, the sidebar should shift to a collapsed icon-first state rather than relying on dashboard cards for navigation
- The retired dashboard page should no longer be part of the user flow; entry should land directly on the chosen operational page

## Data flow and APIs consumed
- The shell itself should rely on route state for active highlighting and collapsed behavior; it does not require new backend APIs
- Existing pages continue consuming their current APIs unchanged, including the existing products, raw products, expenses, sales, customers, and reports endpoints
- Reports remain reachable through the sidebar and continue using existing reporting endpoints such as `/api/reports/summary`
- Dashboard-only counts should be removed from the primary flow; if `/api/stats` exists only for dashboard cards, it becomes a cleanup/deprecation candidate for backend review

## Theme/branding notes
- Canonical implementation target should be `public/logo.png` if that asset is added/present at implementation time
- Current workspace branding still references `public/nuttiness-logo.png`; asset normalization is needed before implementation so the shell uses one canonical logo source
- Theme accents should stay aligned to the current warm brand palette already reflected in the app:
  - primary: warm nut-brown
  - secondary/accent: amber-gold
- Implementation should likely formalize sidebar-friendly tokens for background, active item, hover, border, and focus ring so the shell stays consistent with Tailwind theme configuration

## UX/accessibility notes
- Sidebar navigation must remain keyboard reachable in expanded and collapsed states
- Active nav item should expose clear visual contrast and `aria-current` behavior
- Collapsed mode must preserve discoverability of destinations through visible icons plus accessible labels/tooltips/screen-reader text
- Focus states should be prominent for nav items and the collapse control
- Hit targets should remain comfortable on narrower screens
- Redirect behavior from `/` and `/dashboard` should feel immediate and should not surface an intermediate dashboard screen

## Acceptance criteria
- Shared left sidebar shell is defined for the main application routes and their operational child pages
- Sidebar includes Sales, Expenses, Raw Products, Products, Customers, and Reports in a consistent operational order
- Root `/` and legacy `/dashboard` are treated as redirects to the chosen default operational page (`/sales` per approved plan)
- Dashboard card navigation/counts are removed from the intended user flow
- Existing page-level dashboard return links are removed from the intended shell-based navigation pattern
- Active route highlighting is part of the sidebar design
- Narrow-screen behavior includes a collapsed/icon-first navigation state
- No new business rules, calculations, entities, or validation semantics are introduced

## Stop
No code yet. This is a UI design note only and implementation must wait for explicit approval/orchestration.