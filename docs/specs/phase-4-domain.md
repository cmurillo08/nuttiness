---
title: Phase 4 Domain Spec — Sales
description: Domain specification for Phase 4 (Sales). Aligns precisely with docs/plans/phase-4-sales.md.
---

# Domain spec: Phase 4 Sales

## Overview

This document defines the sales domain for Phase 4 and is aligned exactly to the Phase 4 plan (`docs/plans/phase-4-sales.md`). It describes entities, DB table fields, API contracts, validations, lifecycle rules and acceptance criteria. Inventory and stock effects are explicitly out of scope.

## Scope

- Sales (orders) and sale line items referencing `PreparedProduct`.
- REST API routes for listing, fetching, creating, and transitioning sales (status changes represent payment/fulfillment).
- Frontend pages for creating/listing/viewing sales.

Out of scope: inventory adjustments, invoicing, refunds, multi-currency, and payment gateway integrations.

## Domain Model

Entities (names and fields follow the Phase 4 plan exactly):

- Sale
  - `id: uuid` (PK)
  - `date: datetime`
  - `customer: string | null`
  - `status: enum('prepared','delivered','paid','cancelled')`
  - `total_amount: numeric(12,2)`
  - `created_by: string | null`
  - `created_at: datetime`
  - `updated_at: datetime`

- SaleLine
  - `id: uuid` (PK)
  - `sale_id: uuid` (FK -> sales.id)
  - `prepared_product_id: uuid | null` (FK -> prepared_products.id)
  - `quantity: numeric(12,3)`
  - `unit_price: numeric(12,2)`
  - `line_total: numeric(12,2)`

Notes:
- Monetary fields: `numeric(12,2)`.
- Quantity: `numeric(12,3)` (allows fractional quantities per plan).
- `total_amount` is stored on `sales` as the authoritative sale total.

## Database Design (DDL snippets)

Postgres-compatible snippets (Backend Agent will adapt UUID generation functions to project conventions):

```sql
CREATE TABLE sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date timestamptz NOT NULL DEFAULT now(),
  customer text,
  status text NOT NULL DEFAULT 'prepared',
  total_amount numeric(12,2) NOT NULL DEFAULT 0.00,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_sales_status ON sales(status);

CREATE TABLE sale_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  prepared_product_id uuid NULL REFERENCES prepared_products(id),
  quantity numeric(12,3) NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  line_total numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_sale_lines_sale_id ON sale_lines(sale_id);
```

## Backend Design — API

Base path: `/api/sales`

1) List sales
- GET /api/sales
- Query params: `limit`, `offset`, `status` (prepared|delivered|paid|cancelled)
- Response: 200 `{ data: [ {id, date, customer, status, total_amount, created_at} ], limit, offset, total }`

2) Get sale
- GET /api/sales/:id
- Response: 200 `{ id, date, customer, status, total_amount, created_at, updated_at, created_by, lines: [ {id, prepared_product_id, quantity, unit_price, line_total} ] }`

3) Create sale
- POST /api/sales
- Request body example:
  {
    "date": "2026-03-23T12:00:00Z",
    "customer": "Customer name",
    "status": "prepared",          -- optional; defaults to 'prepared'
    "created_by": "user-123",
    "lines": [ { "prepared_product_id": "...", "quantity": 2.5, "unit_price": "1500.00" } ]
  }
- Behavior: server computes `line_total` = round(unit_price * quantity,2) for each line and `total_amount` = sum(line_total). Returns 201 plus created sale with persisted lines.

4) Transition status
- POST /api/sales/:id/transition
- Request body: `{ "to_status": "delivered" }` (allowed: prepared|delivered|paid|cancelled)
- Behavior: enforce lifecycle rules (see Business Rules), validate preconditions (e.g., >=1 line when transitioning to delivered/paid). Return 200 with updated sale.

5) Cancel sale (optional shortcut)
- POST /api/sales/:id/cancel
- Behavior: mark sale `status` = 'cancelled' if allowed by business rules/permissions.

Errors: return structured errors (400/422 for validation, 403 for permissions, 404 for not found).

## Validations

- On create/update:
  - Each line: `quantity` > 0, `unit_price` >= 0.00.
  - `prepared_product_id` if present must reference an existing `PreparedProduct`.
  - `lines`: sales typically require >=1 line; server may accept empty lines only for special cases but transitions to fulfillment/payment require >=1 line.
- Server authoritative: always compute `line_total` and `total_amount`; ignore client-supplied totals.
- Rounding: round monetary products to 2 decimals (bankers rounding is acceptable; specify in open questions).

## Business Rules (lifecycle)

- Status enum: `prepared` -> `delivered` -> `paid`; `cancelled` is terminal.
- Allowed transitions:
  - `prepared` -> `delivered`
  - `delivered` -> `paid`
  - `prepared|delivered` -> `cancelled` (requires permission/audit)
- Disallowed transitions: `paid` -> any other.
- Preconditions:
  - To transition to `delivered` or `paid`, sale must have >=1 valid line and totals must validate server-side.
- Snapshotting: if `prepared_product_id` is provided, backend should snapshot identifying fields (name/sku/unit_price) on the line record for auditability.
- Inventory: no inventory actions in this phase.

## Frontend Design (minimal)

Pages (per plan):
- `/sales` — list with filters by `status`, date, customer.
- `/sales/new` (or `/pos`) — form to create sale: date, customer, add lines (select PreparedProduct or free-text), quantity, unit_price. Save creates sale.
- `/sales/:id` — detail view with lines, `total_amount`, and controls to transition status or cancel (permission gated).

Components:
- `OrderBuilder` (search/select PreparedProduct, set qty, unit_price)
- `OrderTable` / `SaleTable` (list view)

Client-side validation should mirror server rules but server is authoritative.

## Acceptance Criteria

- Tables `sales` and `sale_lines` exist with fields matching the plan.
- `POST /api/sales` persists a sale and its lines, computing `line_total` and `total_amount` server-side and returns 201 with the saved entity.
- `GET /api/sales` and `GET /api/sales/:id` return expected fields and lines.
- Status transitions enforced by `POST /api/sales/:id/transition` follow lifecycle rules and permissions; invalid transitions return 400/403/422.
- Validation errors return structured payloads identifying failing fields.
- No inventory side-effects occur when sales are created or transitioned.

## Example error payloads

Validation error (422):

```json
{
  "error": "validation_error",
  "details": [ { "field": "lines[0].quantity", "message": "quantity must be > 0" } ]
}
```

Auth error (403):

```json
{ "error": "forbidden", "message": "missing permission: sales:transition" }
```

## Open questions for Architect / human approval

1) Confirm status names: plan uses `prepared`, `delivered`, `paid`, `cancelled` — approve.
2) Permission names: prefer `sales:transition` and `sales:cancel`? Or map to existing RBAC roles?
3) Rounding policy: per-line rounding to 2 decimals; confirm rounding mode (half-up vs bankers).
4) Fractional quantities: plan uses `numeric(12,3)` — approve or require integers?
5) PreparedProduct snapshot fields: which fields must be stored on the sale line (name, sku, unit_price)?

---

File: docs/specs/phase-4-domain.md
