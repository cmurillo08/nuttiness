---
title: Phase 3 Domain - Expenses
---

# Phase 3 Domain: Expenses (single-entity model)

## 1. Overview

This revised spec models purchases as a single `Expense` entity. Each `Expense` record represents a purchase of a single `RawProduct` (or a generic expense) and includes `raw_product_id`, `quantity`, and `cost`. We remove the separate `ExpenseLine` entity to align with the existing schema and keep the implementation simple.

Currency for all monetary fields is Costa Rican colones (CRC).

## 2. Scope

- Included:
  - Single-table `expenses` model capturing purchases (one row per purchased item).
  - CRUD APIs for `Expense` at `/api/expenses`.
  - Validation and referential integrity against `raw_products`.
- Excluded:
  - Multi-line invoices and aggregated invoice documents (out of scope for Phase 3).
  - Complex tax/accounting workflows.

## 3. Domain Model

Expense (single table)
- `id`: UUID (PK)
- `raw_product_id`: UUID (nullable) — references `RawProduct.id` when applicable
- `quantity`: decimal — > 0
- `cost`: decimal — unit cost in CRC (renamed from `unit_cost`)
- `purchased_at`: timestamp — when the purchase occurred
- `notes`: text (optional)
- `created_at`: timestamp
- `updated_at`: timestamp

Constraints & relationships
- `raw_product_id` if present must reference an existing `raw_products.id` (DB FK, ON DELETE RESTRICT).
- Use numeric precision suitable for money (`numeric(12,2)`) and quantity (`numeric(12,3)`).

Example high-level DDL fragment (informational):

-- expenses (single-row per purchased item)
-- id UUID PRIMARY KEY
-- raw_product_id UUID REFERENCES raw_products(id) ON DELETE RESTRICT
-- quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0)
-- cost NUMERIC(12,2) NOT NULL CHECK (cost >= 0)
-- purchased_at TIMESTAMP NOT NULL
-- notes TEXT
-- created_at TIMESTAMP NOT NULL DEFAULT now()
-- updated_at TIMESTAMP

## 4. Backend Design

API routes (base path `/api/expenses`)

- GET /api/expenses
  - List expenses (filters: `limit`, `offset`, `since`, `until`, `vendor`, `raw_product_id`). Returns rows with pagination metadata.

- GET /api/expenses/:id
  - Return a single `Expense` row.

- POST /api/expenses
  - Create a single `Expense` row. Request must include `raw_product_id` (or null), `quantity`, `cost`, and `purchased_at`.

- PUT /api/expenses/:id
  - Update an `Expense` row.

- DELETE /api/expenses/:id
  - Delete an `Expense` row.

Validation rules (server-side):
- `purchased_at`: required, valid ISO timestamp
- `quantity`: required, decimal > 0
- `cost`: required, decimal >= 0
- `raw_product_id`: if present, must be an existing `raw_products.id`

Error codes: 200/201/204/400/404/409/422/500 as appropriate.

## 5. Frontend Design

- Map to existing routes under `app/expenses`.
- Forms and pages should work with single-row expenses: `quantity` and `cost` fields (no line editor needed).

## 6. Acceptance Criteria

1. POST /api/expenses creates a row when given valid `raw_product_id` (or null), `quantity`, `cost`, and `purchased_at` and returns 201 with the stored row.
2. Validation: negative `quantity` or `cost` returns 422 with clear errors.
3. Referential integrity: providing an unknown `raw_product_id` returns 400/422.
4. GET/PUT/DELETE behave as RESTful CRUD for single-row expenses.

---

Stop: This updated spec removes `ExpenseLine` and models purchases as single `Expense` rows. Please reply with `approved` / `continue` / `proceed` to authorize me to instruct the Backend Agent to implement routes and any migrations based on this revised spec.
  - Description: Create a new expense with lines (atomic).
  - Request 201: returns created expense with lines.
  - Request body (example):

```json
{
  "date": "2026-03-23T12:00:00Z",
  "vendor": "ACME Supplies",
  "notes": "Office supplies",
  "lines": [
    {
      "raw_product_id": "raw-123",
      "description": "Printer paper",
      "quantity": "10",
      "unit_price": "500.00",
      "taxable": true,
      "tax_amount": "200.00"
    },
    {
      "description": "Staples",
      "quantity": "1",
      "unit_price": "100.00",
      "taxable": false,
      "tax_amount": "0.00"
    }
  ]
}
```

  - Backend responsibilities on create:
    - Validate all required fields (see Validation rules below).
    - Compute per-line `line_total` and overall `subtotal`, `tax_total`, `total`. If caller provides totals, validate they match computed values — otherwise overwrite stored totals with computed values.
    - Enforce `currency` == `CRC`.
    - Ensure any `raw_product_id` values exist in `raw_products` table.
    - Persist `Expense` and `ExpenseLine` rows atomically in a transaction.

- PUT /api/expenses/:id
  - Description: Full update of an expense and its lines (replace lines array).
  - Response 200: updated resource.
  - Backend must re-validate and re-calculate totals, apply same rules as create.

- DELETE /api/expenses/:id
  - Description: Delete an expense and its lines (logical or physical delete as per system policy). Backend should at minimum prevent deletion if a downstream accounting lock exists (out of scope). For Phase 3, allow deletion and cascade to lines.
  - Response 204 on success.

Optional lines-only endpoints (if preferred):
- POST /api/expenses/:id/lines — add line(s)
- PUT /api/expenses/:id/lines/:lineId — update a single line
- DELETE /api/expenses/:id/lines/:lineId — remove a line

Validation rules (server-side authoritative):
- Expense
  - `date`: required, valid ISO timestamp.
  - `vendor`: required, non-empty string.
  - `lines`: required, non-empty array.
  - `currency`: must be `CRC` (reject otherwise, 400).

- ExpenseLine (per line)
  - `description`: required, non-empty.
  - `quantity`: required, decimal > 0.
  - `unit_price`: required, decimal >= 0.
  - `taxable`: boolean (default `false` if omitted).
  - `tax_amount`: decimal >= 0; backend validates that tax_amount <= quantity * unit_price.
  - `raw_product_id`: if present, must be a valid UUID referencing `RawProduct.id`.

Referential integrity rules:
- `expense_id` in `expense_lines` must reference an existing `expenses.id` (DB FK).
- `raw_product_id` must reference an existing `raw_products.id`. Backend should reject creation/update with unknown `raw_product_id` (400 / 422).
- Deleting a `RawProduct` is disallowed if it is referenced by any `ExpenseLine` (response 409 Conflict). Alternatively, a domain decision may be to allow `raw_products` soft-delete; Backend must ensure historical expense lines remain readable.

Error cases and status codes:
- 200 OK — successful GET/PUT
- 201 Created — successful POST
- 204 No Content — successful DELETE
- 400 Bad Request — malformed JSON, invalid types, currency mismatch
- 422 Unprocessable Entity — semantic validation failures (e.g., totals mismatch, negative amounts)
- 404 Not Found — resource not found
- 409 Conflict — referential integrity violation (attempt to delete referenced RawProduct) or concurrent update conflict
- 500 Internal Server Error — unexpected failures

Example error response (validation):

```json
{
  "error": "validation_error",
  "message": "Line 1: quantity must be > 0"
}
```

## 5. Frontend Design

Map to existing routes under `app/expenses`.

- Pages & routes:
  - `app/expenses/page.js` — Expense list page (index)
  - `app/expenses/new/page.js` — Create expense page
  - `app/expenses/[id]/page.js` — View and edit expense page

- Components (existing components to reuse):
  - `EntityTable.jsx` — list with columns: Date, Vendor, Subtotal, Tax, Total, Actions
  - `EntityForm.jsx` / `ProductForm.jsx` (adapted) — expense form wrapper
  - `Amount.jsx` — monetary formatting in CRC
  - `ConfirmDialog.jsx` — confirm delete
  - `ExpenseLines` (new small component) — UI for adding/removing/editing lines with columns: Description, RawProduct (search by id/name), Quantity, Unit Price, Taxable checkbox, Tax Amount, Line Total

- User flows:
  1. List Expenses
     - Displays paged list. Each row has view/edit and delete actions. Clicking a row opens `app/expenses/[id]`.
  2. Create Expense
     - `app/expenses/new` shows a form with `date`, `vendor`, `notes`, and a dynamic `ExpenseLines` table. Lines can be added via a row editor. Frontend validates required fields and positive numbers before submitting.
     - On submit, call `POST /api/expenses`. If server returns validation errors, display inline field errors.
  3. View / Edit Expense
     - `app/expenses/[id]` shows header info and the lines list. Edit toggles into a form that allows full replace of lines. Save calls `PUT /api/expenses/:id`.
  4. Delete Expense
     - Trigger `DELETE /api/expenses/:id` with confirmation dialog. On success, navigate back to list and refresh.

- Client-side validation (minimal, UX-focused):
  - Required fields: date, vendor, at least one line, line.description, line.quantity (>0), line.unit_price (>=0).
  - Display computed subtotal, tax_total, and total as user edits lines (client-side computed for UX). Backend is authoritative; client should show any server-provided adjustments or errors.

- Wireframe (textual minimal):
  - List page: [Header: Expenses] [New Expense Button] [EntityTable rows]
  - New/Edit page: [Form: Date | Vendor | Notes] [ExpenseLines table editable rows] [Computed Subtotal | Tax | Total] [Save | Cancel]

## 6. Acceptance Criteria

1. Create Expense with lines: Given a valid create payload (two lines, one taxable), POST /api/expenses returns 201 and stored `subtotal`, `tax_total`, and `total` match server-calculated values. Frontend displays the created expense and totals in CRC.
2. Referential integrity: Creating/updating an Expense with a `raw_product_id` that does not exist returns 400/422; creating with valid `raw_product_id` stores the reference and the GET /api/expenses/:id response includes the `raw_product_id` on lines.
3. Validation enforcement: Creating or updating with invalid numbers (negative quantity or unit_price) returns 422 with clear error messages; frontend surfaces these messages inline.
4. Edit and Delete: PUT /api/expenses/:id updates lines atomically (old lines replaced), and DELETE /api/expenses/:id returns 204 and subsequent GET returns 404.
5. UI/UX: `app/expenses` pages exist and allow the flows (list, create, view/edit, delete). Amounts shown in the UI are formatted in CRC and match backend values.
6. Referential delete protection: Attempting to delete a `RawProduct` that is referenced by any `ExpenseLine` results in 409 Conflict (backend enforces constraint), preserving historical expense integrity.

---

Stop: This document is the Phase 3 domain specification for Expenses. Await Architect review and orchestration before implementing.
