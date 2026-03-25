# Phase 6: Reporting and Shared Pagination

## Overview
Add two cross-cutting improvements to the product:
1. A reusable pagination pattern for all list pages.
2. A first reporting view focused on financial totals and historical profit.

This phase improves usability for large datasets and adds a simple business summary without introducing advanced filtering yet.

## Objectives
1. Create a shared pagination component used across all paginated list pages.
2. Standardize list page behavior with a default page size of 25.
3. Keep table headers visible while scrolling table content.
4. Add a dashboard Reports card that links to a new reports page.
5. Provide an up-to-date financial report with total expenses, total sales, and historical profit.

## Scope

### Included
- Shared pagination component contract for list pages.
- Default `limit=25` behavior across list APIs and UI tables.
- Pagination UI containing:
  - page navigation controls
  - limit selector inside the pagination component
  - text summary in the form `Showing x of y`
- Scrollable table body pattern with sticky table header.
- Dashboard Reports card.
- New reports page for top-level financial summary.
- Backend summary endpoint(s) needed to compute:
  - total expenses amount
  - total sales amount
  - historical profit (`sales total - expenses total`)

### NOT Included
- Date filters
- Customer/product-level report breakdowns
- Export to CSV/PDF
- Charts or advanced visual analytics
- Inventory valuation or cost-of-goods profit calculations
- Multi-period comparisons

## Domain Considerations

### Shared Pagination Rules
- Pagination behavior must be consistent across raw products, prepared products, expenses, sales, and customers lists.
- If no limit is provided, the system defaults to 25.
- The pagination summary must reflect the current visible slice and total count.
- Pagination UI logic belongs in shared frontend components; backend remains responsible for `limit`, `offset`, and total count contracts.

### Reporting Rules
- Historical profit for this phase is defined as:
  - `historical_profit = total_sales_amount - total_expenses_amount`
- Sales total uses persisted sales/order totals already recognized by the system.
- Expense total uses persisted expense amounts already recorded by the system.
- This is an aggregate business snapshot, not an accounting-grade profit-and-loss statement.

## Backend Design

### API Additions/Adjustments
- Update list endpoints to support a standardized response contract for pagination where needed:
  - `GET /api/raw-products`
  - `GET /api/products`
  - `GET /api/expenses`
  - `GET /api/sales`
  - `GET /api/customers`
- Introduce or standardize query parameters:
  - `limit` (default 25)
  - `offset` (default 0)
- Standardize response metadata to include enough information for shared pagination, for example:
  - `items`
  - `total`
  - `limit`
  - `offset`

### Reports Endpoint
- New endpoint:
  - `GET /api/reports/summary`
- Response should include at minimum:
  - `total_expenses_amount`
  - `total_sales_amount`
  - `historical_profit`
  - `generated_at`

### Validation / Constraints
- `limit` must be a positive integer from an approved UI set.
- `offset` must be a non-negative integer.
- Report totals must be computed from persisted data only.
- Empty datasets must return zero-valued totals, not errors.

## Frontend Design

### Shared Pagination Component
Create a reusable pagination component for all list pages with:
- previous/next controls
- limit selector embedded in the component
- `Showing x of y` summary text
- disabled states for invalid navigation
- compatibility with current search/filter controls on each page

### Table Layout Pattern
All list pages should adopt a consistent table shell:
- sticky table header
- vertically scrollable table body
- pagination component placed below the table
- limit selector removed from page-specific top filter areas

### Pages Updated
- `/raw-products`
- `/products`
- `/expenses`
- `/sales`
- `/customers`

### New Dashboard Element
- Add a Reports card on `/dashboard`
- Card links to the new reports page
- Card should be visually consistent with existing dashboard summary cards

### New Reports Page
- Route: `/reports`
- Initial content:
  - total expenses amount
  - total sales amount
  - historical profit
  - optional generated-at timestamp
- Keep layout simple and extensible for future filters

## User Flows
1. User opens any list page and sees 25 records by default.
2. User scrolls inside the table while the header remains visible.
3. User changes page size from within the pagination component.
4. User sees `Showing x of y` feedback and navigates forward/backward.
5. User opens the dashboard, clicks Reports, and views current business totals.

## Acceptance Criteria
- [ ] All primary list pages use the same shared pagination component.
- [ ] Default list page size is 25 when no explicit limit is selected.
- [ ] Limit selector is no longer displayed above tables; it is part of pagination.
- [ ] Tables support scrollable bodies with sticky headers.
- [ ] Pagination summary displays in `Showing x of y` format.
- [ ] Dashboard includes a Reports card linking to `/reports`.
- [ ] Reports page displays total expenses, total sales, and historical profit.
- [ ] Historical profit is calculated as total sales minus total expenses.
- [ ] Empty or low-data states render without runtime errors.

## Dependencies / Notes
- Builds on Phases 2–5 because it touches products, expenses, sales, and customers pages.
- Domain Agent should confirm reporting terminology and aggregate definitions.
- Backend Agent should preserve existing list endpoint behavior where possible while standardizing pagination metadata.
- Frontend Agent should implement the pagination component as a shared reusable component and keep the reports page ready for future filter expansion.
- Frontend Agent should keep canonical brand assets in `public/` and derive any new report/dashboard theme accents from the logo design if new tokens are introduced.

---
Stop: do NOT implement or delegate yet. Wait for explicit human approval.
