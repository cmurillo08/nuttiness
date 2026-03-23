---
phase: 3
title: Expenses
summary: Define purchases/expenses and purchase line items; record purchase prices for reporting (no inventory tracking).
---

## 1. Overview

What: Phase 3 specifies how purchases (expenses) are recorded, how they reference `RawProduct` purchase catalog entries, and how inventory entries are created for later reconciliation and reporting.

Why: Expenses provide the historical purchase prices needed for cost tracking and financial reporting. This phase makes the expense domain explicit for the Domain Agent and Backend/Frontend implementations. Inventory is not tracked in initial phases.

## 2. Scope

Included
- Expense aggregates (purchase documents) and line items referencing `RawProduct` entries.
- API contract for expense CRUD.
- Frontend pages for entering purchases and viewing purchase history.

Not included
- Automatic cost propagation into `PreparedProduct` (costs are recorded manually in Phase 1/2).
- Complex supplier reconciliation, tax calculations, or accounting integrations (out of scope).

## 3. Domain Model (expenses)

Entities
- Expense
  - id (uuid)
  - date (date)
  - supplier (string) optional
  - total_amount (decimal)
  

- ExpenseLine
  - id (uuid)
  - expense_id (uuid)
  - raw_product_id (uuid)
  - quantity (decimal)
  - unit_price (decimal)
  - line_total (decimal) computed as quantity * unit_price

/* InventoryEntry removed — inventory is not tracked in current phases. */

Relationships
- Expense has many ExpenseLine; each ExpenseLine references a `RawProduct`.
- Expenses do NOT create inventory records in this phase.

## 4. Database Design (tables)

-- expenses (id, date, supplier, total_amount, created_at, updated_at)
-- expense_lines (id, expense_id, raw_product_id, quantity, unit_price, line_total)

Primary keys: uuid. Use numeric/decimal for monetary and quantity fields. Timestamps: created_at/updated_at.

## 5. Backend Design (API)

Principles
- RESTful endpoints; backend enforces referential integrity and basic validation.

Routes & Example payloads

- List expenses
  - GET /api/expenses
  - Response: 200 [{id, date, supplier, total_amount}]

-- Get expense
  - GET /api/expenses/:id
  - Response: 200 {id, date, supplier, total_amount, lines: [{raw_product_id, quantity, unit_price, line_total}]}

-- Create expense
  - POST /api/expenses
  - Request: {date, supplier?, lines: [{raw_product_id, quantity, unit_price}]}
  - Response: 201 {id, ...}

/* Inventory entries endpoint removed — inventory is not tracked in current phases. */

Validation (high-level)
- `lines` required with at least one entry.
- Each line's `raw_product_id` must reference an existing RawProduct.
- Quantities and unit_price must be positive numbers.

- ## 6. Frontend Design (pages & components)

Styling
- Use Tailwind CSS utility classes for layout and form styling.

Pages
- /expenses — list of purchases with filters (date, supplier)
- /expenses/new — create expense form with dynamic lines
- /expenses/[id] — expense detail and ability to edit (if permitted)

Components
- `ExpenseTable` — displays expenses
- `ExpenseForm` — header fields + `ExpenseLinesEditor`
- `ExpenseLinesEditor` — add/remove lines, select `RawProduct`, enter quantity and unit price, calculate line totals and expense total

User flows
- Record purchase: open `/expenses/new`, add lines selecting items from `RawProduct`, enter quantities and prices, submit → backend records expense lines and totals (no inventory records created).

## 7. Acceptance Criteria

- DB tables for `expenses` and `expense_lines` are specified.
- API contract for creating/listing/getting expenses is documented above.
- Frontend pages and components for entering purchases are described.
- Spec reviewed and approved by human (approval tokens: `approved` / `continue` / `proceed`).

## Spec Template Checklist

- Summary: 1–2 lines
- API contract: example request/response for expense routes
- Data model: required fields + types for expense entities
- Validation rules: primary constraints (lines required, positive numbers)
- Minimal UI page list and components
- Acceptance tests: checklist above

## Next Steps (after approval)

- Architect records approval in the todo tool and instructs `Domain Agent` to author expense entities and rules (inventory entry creation behavior).
- Backend Agent will design migrations for `expenses` and `expense_lines` after Domain Agent outputs.

---
Stop: do NOT implement code. Wait for explicit human approval to proceed.
