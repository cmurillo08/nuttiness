---
phase: 4
title: Sales
summary: Define sales/orders model, order line items, payments, and API/UI contracts for recording sales (no inventory tracking).
---

## 1. Overview

What: Phase 4 specifies the sales (orders) domain: order documents and order lines referencing `PreparedProduct`.

Why: Sales are the primary revenue events. This phase defines the contracts the Domain Agent will use to author business rules (order state transitions and payment/status handling). Inventory is not tracked in these phases.

Files & dependencies
- Builds on Phase 1 (entities) and Phase 3 (expenses). Domain Agent should coordinate with Expense definitions for consistency; inventory semantics are out of scope for current phases.

## 2. Scope

Included
- Sales/Sale aggregates and SaleLine items referencing `PreparedProduct`.
- Order status lifecycle (prepared → delivered → paid) — payments are represented by status transitions, not a separate Payment entity.
- API contract for creating/listing/getting orders.
- Frontend pages for order creation (POS/checkout) and order list/detail.

Not included
- Complex invoicing, refunds, multi-currency accounting, or advanced payment gateways.

## 3. Domain Model (sales)

Entities
-- Sale (Order)
  - id (uuid)
  - date (datetime)
  - customer (string) optional
  - status (enum: prepared, delivered, paid, cancelled)
  - total_amount (decimal)
  - created_by (string/user_id) optional

- SaleLine
  - id (uuid)
  - sale_id (uuid)
  - prepared_product_id (uuid)
  - quantity (decimal)
  - unit_price (decimal)
  - line_total (decimal)

/* Inventory impact removed — inventory is not tracked in current phases. */

## 4. Database Design (tables)

- sales (id, date, customer, status, total_amount, created_by, created_at, updated_at)
- sale_lines (id, sale_id, prepared_product_id, quantity, unit_price, line_total)

Primary keys: uuid. Monetary fields: numeric/decimal. Timestamps: created_at/updated_at.

## 5. Backend Design (API)

Principles
- RESTful endpoints; backend enforces validation and state transitions. Domain Agent will define exact rules for when inventory entries are created.

Routes & Example payloads

- List sales
  - GET /api/sales
  - Response: 200 [{id, date, status, total_amount}]

-- Get sale
  - GET /api/sales/:id
  - Response: 200 {id, date, status, total_amount, lines: [{prepared_product_id, quantity, unit_price, line_total}]}

- Create sale
  - POST /api/sales
  - Request: {date?, customer?, lines: [{prepared_product_id, quantity, unit_price}], status?: 'draft' }
  - Response: 201 {id, ...}

-- Confirm sale
  - POST /api/sales/:id/confirm
  - Behavior: validate availability (Domain Agent to define). Inventory effects are out of scope for this phase.



Validation (high-level)
- `lines` required with at least one entry when creating a non-draft sale.
- Quantities and unit_price must be positive.
- `prepared_product_id` must reference an existing PreparedProduct.

- ## 6. Frontend Design (pages & components)

Styling
- Use Tailwind CSS utility classes for layout and checkout/pos styling.

Pages
- /sales — list of orders with filters (date, status)
- /sales/new or /pos — create order / POS checkout flow
- /sales/[id] — order detail, ability to confirm/record payment

Components
- `OrderBuilder` — search/select `PreparedProduct`, set qty, compute totals
- `OrderTable` — lists orders

User flows
- POS flow: build order → submit as `prepared` or directly as `delivered` → mark `paid` when payment is received (status change). No inventory records are created in these phases.

## 7. Acceptance Criteria

- Sales model and DB tables specified (sales, sale_lines).
- API routes for creating/listing/getting/confirming sales are documented.
- Frontend pages and components for creating orders and recording payments described.
- Spec reviewed and approved by human (approval tokens: `approved` / `continue` / `proceed`).

## Spec Template Checklist

- Summary: 1–2 lines
- API contract: example request/response for sale routes
- Data model: required fields + types for sale entities
- Validation rules: primary constraints (lines required, positive numbers)
- Minimal UI page list and components
- Acceptance tests: checklist above

## Next Steps (after approval)

- Architect records approval in the todo tool and instructs `Domain Agent` to produce sale-related business rules (availability checks, cancellation effects). Inventory consumption timing is deferred to a later phase.
- Backend Agent will design migrations and API handlers only after Domain Agent outputs and explicit approval.

---
Stop: do NOT implement code. Wait for explicit human approval to proceed.
