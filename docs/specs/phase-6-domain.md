---
phase: 6
title: Phase 6 — Domain Spec (Reporting and Pagination)
summary: Domain specification for Phase 6: standardized pagination contract across all list endpoints, Report aggregate for financial summary (total expenses, total sales, historical profit), and supporting business rules.
---

## 1. Overview

Phase 6 introduces two cross-cutting domain improvements:

1. **Shared Pagination Contract**: A standardized pagination pattern applied uniformly across all list endpoints (RawProduct, PreparedProduct, Expense, Sale, Customer). This ensures consistent user experience and simplifies frontend pagination logic.

2. **Financial Reporting Aggregate**: A read-only `Report` aggregate that computes and surfaces the organization's core financial snapshot: total expenses, total sales revenue, and historical profit (defined as sales revenue minus total expenses).

These features improve usability for large datasets and provide business stakeholders with immediate visibility into financial performance without introducing advanced forecasting or multi-period analysis.

## 2. Scope

### Included
- **Pagination contract**: standardized `limit` and `offset` query parameters with default `limit=25`, applicable to all list endpoints.
- **Pagination response metadata**: consistent JSON structure containing `items`, `total`, `limit`, and `offset` fields.
- **Report aggregate** (`FinancialReport`): a computed, read-only snapshot containing:
  - `total_expenses_amount`: sum of all `Expense.cost * Expense.quantity` across persisted records.
  - `total_sales_amount`: sum of all `Sale.total_amount` across persisted records.
  - `historical_profit`: calculated as `total_sales_amount - total_expenses_amount`.
  - `generated_at`: timestamp when the report was queried.
- **Backend endpoint**: `/api/reports/summary` returning a single `FinancialReport` object.
- **Frontend pagination component**: shared, reusable UI component for list navigation with limit selector and "Showing x of y" summary.

### NOT Included
- Date range filtering or time-series breakdowns (reserved for future phases).
- Customer-level or product-level profit analysis.
- Cost-of-goods-sold (COGS) accounting or inventory valuation.
- CSV/PDF export or advanced charting.
- Customer segmentation or A/B cohort reporting.
- Accounts payable/accounts receivable aging.
- Multi-currency or currency conversion.

---

## 3. Domain Model

### Pagination Contract (Shared Pattern)

**Description**: Pagination is a shared contract rule, not a standalone entity. It applies to all list endpoints and standardizes how the system handles large result sets.

**Fields**:
- `limit` (integer, optional, default 25): maximum number of items to return in a single response. Must be a positive integer from an approved set (e.g., 10, 25, 50, 100).
- `offset` (integer, optional, default 0): number of items to skip from the beginning of the result set. Must be a non-negative integer.

**Response Metadata Structure** (applied to all list endpoints):
```json
{
  "items": [...],           // array of resource objects
  "total": <integer>,       // total count of resources (before pagination)
  "limit": <integer>,       // the limit applied to this response
  "offset": <integer>       // the offset applied to this response
}
```

**Invariants**:
- If `limit` is not provided, the system defaults to 25.
- If `offset` is not provided, the system defaults to 0.
- Returned `items` array size is `min(limit, total - offset)`.
- `total` represents the absolute count of all available resources before pagination.

---

### Report Aggregate (`FinancialReport`)

**Description**: A read-only, point-in-time computation of the organization's financial position. Report aggregates are calculated on-demand and not persisted as entities.

**Fields (types & constraints)**:
- `total_expenses_amount`: decimal `numeric(12,2)` (>= 0) — sum of all expenses cost. Calculated as: `SUM(Expense.cost * Expense.quantity)` across all non-deleted `Expense` records.
- `total_sales_amount`: decimal `numeric(12,2)` (>= 0) — sum of all completed sales. Calculated as: `SUM(Sale.total_amount)` across all non-deleted, non-cancelled `Sale` records.
- `historical_profit`: decimal `numeric(12,2)` (can be negative) — defined as `total_sales_amount - total_expenses_amount`. Represents net business profit for the history of recorded transactions.
- `generated_at`: timestamp with time zone (required) — ISO 8601 formatted timestamp indicating when this report snapshot was generated (typically the query execution time).

**Example**:
```json
{
  "total_expenses_amount": 5250.50,
  "total_sales_amount": 12400.75,
  "historical_profit": 7150.25,
  "generated_at": "2026-03-24T15:30:45Z"
}
```

**Validation Rules**:
- `total_expenses_amount`: must be a non-negative decimal with no more than 2 decimal places.
- `total_sales_amount`: must be a non-negative decimal with no more than 2 decimal places.
- `historical_profit`: derived field; no independent validation. May be negative if `total_expenses_amount > total_sales_amount`.
- `generated_at`: must be a valid ISO 8601 timestamp (UTC preferred).

---

### Existing Entities - Roles in Aggregation

The following entities (defined in earlier phases) participate in Report calculations. No redefinition occurs in this phase.

**Expense** (from Phase 3)
- **Role in Report**: Each `Expense` contributes its `cost * quantity` to `total_expenses_amount`.
- **Aggregation rule**: Include all non-deleted `Expense` records in the sum. Null `raw_product_id` does not exclude an expense from the total.

**Sale** (from Phase 1)
- **Role in Report**: Each `Sale` contributes its `total_amount` to `total_sales_amount`.
- **Aggregation rule**: Include `Sale` records with status in `['prepared', 'delivered', 'paid']`. Exclude `Status = 'cancelled'` from the total.

**RawProduct, PreparedProduct, Customer** (from Phases 1, 2, 5)
- **Role in Report**: Listed in endpoints via pagination but do not directly contribute monetary values to the financial report.

---

## 4. Backend Design

### Pagination Standardization Across List Endpoints

**Affected Endpoints** (each updated to support pagination contract):
- `GET /api/raw-products`
- `GET /api/products`
- `GET /api/expenses`
- `GET /api/sales`
- `GET /api/customers`

**Query Parameter Contract**:
```
GET /api/<resource>?limit=<positive-int>&offset=<non-negative-int>
```

**Response Contract** (all list endpoints):
```json
{
  "items": [ /* array of resource objects */ ],
  "total": <integer>,
  "limit": <integer>,
  "offset": <integer>
}
```

**Behavior**:
- If no `limit` is provided, use 25.
- If `limit` exceeds a system maximum (e.g., 100), reject with 400 Bad Request and a validation error message.
- If `offset` is negative, reject with 400 Bad Request.
- If `offset >= total`, return an empty `items` array with the provided `offset` and `total`.
- Always return `total` as the absolute count of all available resources.

**Validation Rules** (server-side):
- `limit`: optional, positive integer, max 100 (configurable per environment). Default: 25.
- `offset`: optional, non-negative integer. Default: 0.
- If either parameter is malformed (not a valid integer), return 400 with a specific validation error.

---

### Financial Reports Endpoint

**Route**: `GET /api/reports/summary`

**Query Parameters** (none required for Phase 6):
- No date range, customer, or product filters in Phase 6. This is a full snapshot.

**Response Contract** (200 OK):
```json
{
  "total_expenses_amount": 5250.50,
  "total_sales_amount": 12400.75,
  "historical_profit": 7150.25,
  "generated_at": "2026-03-24T15:30:45Z"
}
```

**Response - Empty Dataset** (200 OK):
If no expenses or sales have been recorded, the system returns:
```json
{
  "total_expenses_amount": 0.00,
  "total_sales_amount": 0.00,
  "historical_profit": 0.00,
  "generated_at": "2026-03-24T15:30:45Z"
}
```

**Error Responses**:
- `500 Internal Server Error`: if the database query fails or aggregation encounters an unexpected error.
- No 404 error; the endpoint always exists and returns a valid summary, even if empty.

**Backend Calculation Logic** (pseudocode):
```
total_expenses = SELECT SUM(cost * quantity) FROM expenses WHERE deleted_at IS NULL
total_sales = SELECT SUM(total_amount) FROM sales WHERE status IN ('prepared', 'delivered', 'paid')
historical_profit = total_sales - total_expenses
generated_at = current timestamp in UTC
return { total_expenses_amount, total_sales_amount, historical_profit, generated_at }
```

---

### JSON Schemas

**Pagination Response Schema** (generic for any list endpoint):
```json
{
  "type": "object",
  "required": ["items", "total", "limit", "offset"],
  "properties": {
    "items": {
      "type": "array",
      "items": { "type": "object" },
      "description": "Array of resource objects"
    },
    "total": {
      "type": "integer",
      "minimum": 0,
      "description": "Total count of all available resources"
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "description": "Maximum items per page"
    },
    "offset": {
      "type": "integer",
      "minimum": 0,
      "description": "Number of items skipped"
    }
  }
}
```

**FinancialReport Schema**:
```json
{
  "type": "object",
  "required": ["total_expenses_amount", "total_sales_amount", "historical_profit", "generated_at"],
  "properties": {
    "total_expenses_amount": {
      "type": "number",
      "multipleOf": 0.01,
      "minimum": 0,
      "description": "Sum of all expense costs (cost × quantity)"
    },
    "total_sales_amount": {
      "type": "number",
      "multipleOf": 0.01,
      "minimum": 0,
      "description": "Sum of all non-cancelled sale totals"
    },
    "historical_profit": {
      "type": "number",
      "multipleOf": 0.01,
      "description": "total_sales_amount - total_expenses_amount (can be negative)"
    },
    "generated_at": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp (UTC) when the report was generated"
    }
  }
}
```

---

## 5. Frontend Design

### Shared Pagination Component

**Component Interface**:
```
<Pagination
  items={arrayOfItems}              // rendered items from the current page
  total={totalCount}                // total count from backend
  limit={currentLimit}              // current limit (default 25)
  offset={currentOffset}            // current offset (default 0)
  onLimitChange={handleLimitChange} // callback when user selects a new limit
  onOffsetChange={handleOffsetChange} // callback for prev/next navigation
/>
```

**Component Behavior**:
- Renders a limit selector (dropdown or radio buttons) with options: 10, 25, 50, 100.
- Displays "Showing x of y" summary text (e.g., "Showing 25 of 150").
- Provides "Previous" and "Next" buttons for page navigation.
- Disables "Previous" when `offset === 0`.
- Disables "Next" when `offset + limit >= total`.
- Clicking a limit option triggers `onLimitChange(newLimit)` and resets `offset` to 0.
- Clicking "Previous" or "Next" triggers `onOffsetChange(newOffset)` with the computed new offset.

**Props Documentation**:
- All props are required. If data is loading, display a loading state or skeleton.

---

### Table Layout Pattern

All list pages adopt a consistent table shell:
- **Sticky table header**: column names remain visible during vertical scroll of table body.
- **Scrollable table body**: content area scrolls independently of the header.
- **Pagination below table**: `<Pagination>` component placed directly under the table.
- **Limit selector location**: embedded in the `<Pagination>` component (NOT above the table).
- **Compatibility**: existing search, sort, and filter controls (if any) remain above the table.

---

### Pages Updated

The following pages integrate the shared pagination component and adopt the sticky-header table pattern:
- `/app/raw-products` — RawProduct list
- `/app/products` — PreparedProduct list
- `/app/expenses` — Expense list
- `/app/sales` — Sale list
- `/app/customers` — Customer list

**Page-Level Integration**:
1. Page receives `limit` and `offset` from URL query parameters (or defaults).
2. Page calls the corresponding list API endpoint with `?limit=<limit>&offset=<offset>`.
3. API returns `{ items, total, limit, offset }`.
4. Page renders the table with `items` from the response.
5. Page renders `<Pagination>` with totals and callbacks.
6. When user interacts with pagination, page updates URL query parameters and re-fetches data.

---

### Reports Dashboard Card

**Location**: `/app/dashboard` page

**Card Element**:
- Title: "Financial Reports" or "Reports"
- Content: small summary or call-to-action (e.g., "View financial summary")
- Link: navigates to `/reports`
- Visual style: consistent with existing dashboard summary cards

---

### Reports Page (`/reports`)

**Route**: `/app/reports` (new page)

**Content Structure**:
- Page title: "Financial Reports" or similar
- Main report section displaying:
  - **Total Expenses**: formatted currency amount (e.g., "₡5,250.50")
  - **Total Sales**: formatted currency amount (e.g., "₡12,400.75")
  - **Historical Profit**: formatted currency amount (e.g., "₡7,150.25"), with color coding (green if positive, red if negative)
  - **Generated At**: timestamp (e.g., "Last updated: 2026-03-24 at 15:30 UTC")
- Optional: a "Refresh" button to re-query the report endpoint
- Layout: responsive, clean card-based design compatible with existing Tailwind CSS theme

**Data Fetching**:
- On page load, fetch `GET /api/reports/summary`.
- Display loading state while fetching.
- Handle and display errors gracefully (e.g., "Unable to load report" message).
- Display empty state if all values are zero (no data recorded yet).

---

## 6. Acceptance Criteria

### Pagination Contract
- [ ] **All list endpoints** (`/api/raw-products`, `/api/products`, `/api/expenses`, `/api/sales`, `/api/customers`) accept `limit` and `offset` query parameters.
- [ ] **Default limit is 25**: when `limit` is omitted, the system defaults to 25.
- [ ] **Default offset is 0**: when `offset` is omitted, the system defaults to 0.
- [ ] **Response structure**: all list responses return `{ items, total, limit, offset }` JSON.
- [ ] **Validation**: `limit > 100` or `limit <= 0` or `offset < 0` returns 400 Bad Request with a validation error message.
- [ ] **Boundary handling**: when `offset >= total`, the endpoint returns `{ items: [], total, limit, offset }` (empty but valid).

### Financial Report Endpoint
- [ ] **Endpoint exists**: `GET /api/reports/summary` returns 200 OK with the correct JSON schema.
- [ ] **Calculation correctness**: `total_expenses_amount` = sum of `(Expense.cost * Expense.quantity)` for all non-deleted expenses.
- [ ] **Sales total calculation**: `total_sales_amount` = sum of `Sale.total_amount` for all sales with `status IN ('prepared', 'delivered', 'paid')`.
- [ ] **Cancelled sales excluded**: sales with `status = 'cancelled'` do NOT contribute to `total_sales_amount`.
- [ ] **Profit calculation**: `historical_profit = total_sales_amount - total_expenses_amount`.
- [ ] **Empty dataset**: endpoint returns zero values (not error) when no expenses or sales exist.
- [ ] **Timestamp**: `generated_at` field contains the current UTC timestamp in ISO 8601 format.

### Frontend Pagination Component
- [ ] **Shared component exists**: a single `<Pagination>` component is reusable across all list pages.
- [ ] **Limit selector**: dropdown or radio button set with options 10, 25, 50, 100.
- [ ] **Summary text**: displays "Showing x of y" where x = `offset + min(limit, items.length)` and y = `total`.
- [ ] **Navigation buttons**: "Previous" and "Next" buttons control page navigation.
- [ ] **Button states**: "Previous" disabled when `offset === 0`; "Next" disabled when `offset + limit >= total`.
- [ ] **Callbacks**: `onLimitChange` and `onOffsetChange` are called appropriately.

### Table Layout Pattern
- [ ] **All list pages** adopt sticky table header and scrollable body pattern.
- [ ] **Limit selector removed** from page-specific filter areas above tables.
- [ ] **Pagination component placed** directly below each table.

### Dashboard & Reports Page
- [ ] **Reports card** appears on `/dashboard` and links to `/reports`.
- [ ] **Reports page** (`/reports`) displays total expenses, total sales, and historical profit.
- [ ] **Report page formatting**: amounts are currency-formatted; profit is color-coded (green/red).
- [ ] **Timestamp displayed**: "Generated at" or similar label shows the ISO timestamp.
- [ ] **Error handling**: page displays graceful error message if API call fails.
- [ ] **Empty state**: page displays gracefully when all totals are zero.

### Business Rules Compliance
- [ ] **Historical profit definition**: always calculated as `total_sales_amount - total_expenses_amount` (no alternative formula).
- [ ] **No future phases dependencies**: Phase 6 does NOT assume filters, drill-downs, or multi-period comparison logic.
- [ ] **Existing entities preserved**: RawProduct, PreparedProduct, Expense, Sale, and Customer definitions remain unchanged.
- [ ] **Data persistence**: pagination and report calculations use only persisted, non-deleted records.

---

## Summary

Phase 6 establishes a **standardized pagination contract** across all list APIs (default limit=25, consistent response metadata) and introduces a **FinancialReport aggregate** for real-time business insight (total expenses, total sales, historical profit). The frontend implements a shared pagination component and a reports page to surface these metrics. This phase lays the foundation for scalable list handling and enables business users to monitor profitability without deep technical knowledge.

---

**Next Step**: Return this spec to the Architect Agent for approval. Upon approval, the Backend Agent will implement list endpoint standardization and the `/api/reports/summary` endpoint; the Frontend Agent will implement the shared pagination component and reports page.
