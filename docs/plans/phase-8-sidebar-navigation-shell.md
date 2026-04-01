# Phase 8: Sidebar Navigation Shell

## Overview
Replace the dashboard page with a persistent left sidebar navigation shell that gives users direct access to the main sections of the app.

This phase removes the dashboard-as-home pattern and replaces it with a simpler application shell focused on navigation, branding, and quick movement between pages. The existing dashboard counts and summary cards are intentionally omitted.

## Objectives
1. Remove the dashboard page as the main entry experience.
2. Introduce a shared left sidebar visible across primary app pages.
3. Make navigation consistent across products, raw products, expenses, sales, customers, and reports.
4. Eliminate dependency on dashboard count cards for navigation.
5. Support a responsive collapsed-sidebar behavior inspired by the provided design.

## Scope

### Included
- Shared app shell with left sidebar navigation.
- Branding area at the top of the sidebar using canonical assets from `public/`.
- Primary navigation links for:
  - Sales
  - Expenses
  - Raw Products
  - Products
  - Customers
  - Reports
- Active-state styling for the current section.
- Responsive sidebar behavior:
  - expanded state on larger screens
  - collapsed/icon-first state on narrow screens
- Removal of page-level "Back to Dashboard" logo links where the sidebar replaces that function.
- Route cleanup so `/dashboard` is no longer the primary destination.
- Default landing behavior for `/` and legacy `/dashboard` visits.

### NOT Included
- New business features.
- New counts, KPIs, or summary cards.
- New reporting metrics.
- Permission-based menus.
- Nested submenus.
- Mobile drawer complexity beyond a simple usable collapsed/toggle behavior.
- Backend domain-rule changes.

## Current Problems Being Solved
- Navigation is centered around a dashboard page that mainly acts as a menu.
- Users must bounce back to `/dashboard` to move between sections.
- Multiple pages include repeated header patterns to return to the dashboard.
- Dashboard stats create visual and backend complexity that is not required for the desired workflow.
- The current root route redirects to `/dashboard`, which no longer matches the preferred experience.

## Target Navigation Model

### Application Shell
The app should move to a shared shell pattern:
- left sidebar for global navigation
- main content area for page-specific content
- consistent spacing and branding across all primary pages

### Sidebar Sections
The sidebar should include at minimum:
- logo / brand header
- primary navigation items
- optional collapse control near the bottom

### Navigation Items
Initial menu set:
- Sales
- Expenses
- Raw Products
- Products
- Customers
- Reports

Ordering should favor day-to-day operational flows, with the most frequently used sections near the top.

### Active State
The current route should be visually highlighted so users can immediately identify where they are.

### Responsive Behavior
On narrower widths, the sidebar should collapse into an icon-first layout similar to the provided reference:
- icon remains visible
- text labels may be hidden or reduced
- navigation remains accessible without relying on dashboard cards

## Route and Entry Behavior

### Root Route
- `/` should no longer redirect to `/dashboard`.
- Root should redirect to a primary working page.
- Recommended default destination: `/sales`.

### Legacy Dashboard Route
- `/dashboard` should be retired as a standalone dashboard screen.
- Recommended behavior: redirect `/dashboard` to `/sales` so old bookmarks do not break.

## Domain Considerations
- No new entities are introduced.
- No database schema changes are required.
- No business rules are changed.
- This is a navigation and application-shell phase only.

## Backend Design

### Required Changes
- No new APIs are required for sidebar navigation.
- Any backend endpoint used only for dashboard counts should be reviewed for deprecation.

### Cleanup Guidance
- If `/api/stats` is no longer used anywhere after this phase, Backend Agent should either:
  - remove it as part of this phase, or
  - explicitly mark it as deprecated if immediate removal would create unnecessary risk.
- Shared reporting endpoints such as `/api/reports/summary` remain in scope for the reports page and must not be removed.

## Frontend Design

### Shared Layout
Frontend should introduce a shared layout wrapper for primary authenticated/app pages so navigation is defined once instead of repeated in each screen.

### Affected Pages
At minimum, apply the shared shell to:
- `/sales`
- `/expenses`
- `/raw-products`
- `/products`
- `/customers`
- `/reports`
- create/edit/detail pages under those sections as appropriate for consistency

### Header Simplification
Pages should stop using the logo as a "Back to Dashboard" shortcut once the sidebar is present.

### Visual Direction
Use the provided example as inspiration for:
- rounded active item treatment
- strong active color contrast
- clear icon + label alignment
- clean whitespace
- bottom-aligned collapse affordance

Frontend Agent should derive sidebar theme accents from the logo/brand assets and record any new theme tokens in the implementation notes or theme configuration.

## User Flows
1. User opens `/` and lands on the default operational page without seeing a dashboard.
2. User uses the left sidebar to move between Sales, Expenses, Products, Raw Products, Customers, and Reports.
3. User always sees which section is active.
4. User on a narrow viewport can still navigate using the collapsed sidebar.
5. User visiting an old `/dashboard` bookmark is redirected to the new default destination.

## Acceptance Criteria
- [ ] The app no longer depends on a dashboard page for section-to-section navigation.
- [ ] A shared left sidebar is visible across the main application pages.
- [ ] Sidebar includes links to Sales, Expenses, Raw Products, Products, Customers, and Reports.
- [ ] Current page is visually highlighted in the sidebar.
- [ ] Root route no longer redirects to `/dashboard`.
- [ ] Legacy `/dashboard` visits are redirected to the new default page.
- [ ] Existing page headers no longer include repeated "Back to Dashboard" behavior where the sidebar already provides navigation.
- [ ] Dashboard count cards are removed from the user flow.
- [ ] No new business logic or database schema changes are introduced.
- [ ] Reports functionality remains accessible from the sidebar.

## Dependencies / Notes
- Builds on the existing implemented phases for products, expenses, sales, customers, and reports.
- Domain Agent involvement should be minimal because this phase does not change business rules, but the phase still needs a domain confirmation note stating that no domain model changes are required.
- Backend Agent should focus only on safe cleanup of dashboard-only endpoints if they become unused.
- Frontend Agent should lead implementation because this phase is primarily an app-shell and navigation refactor.

---
Stop: do NOT implement or delegate yet. Wait for explicit human approval.
