---
phase: 1
title: Phase 1 — Domain Spec (Foundation)
summary: Canonical domain specification for Phase 1: RawProduct, PreparedProduct, Expense, Sale, SaleItem plus API contracts, validation rules, and JSON schemas.
---

**Overview**
- Minimal domain specification for Phase 1 covering products, expenses, and sales entities, their relationships, validations, and example API contracts.

**Scope**
- Included: canonical entity definitions for Phase 1 (`RawProduct`, `PreparedProduct`, `Expense`, `Sale`, `SaleItem`), DB column suggestions, relationships, invariants/business rules, validation rules, JSON schemas, REST routes with example request/response payloads, and frontend page/components list with one UI flow example.
- Excluded: implementation code, migrations, inventory adjustments, advanced pricing/inventory algorithms, multi-currency conversion, supplier entities (beyond a free-text `supplier`), and soft-delete semantics (may be added later).

**Domain Model**
- RawProduct
  - Description: Purchased ingredient or raw input (e.g., cashews, sugar).
  - Fields (types & constraints):
    - `id`: UUID (PK, required)
    - Identifiers: use `id` (UUID) as the canonical identifier
    - `name`: string (required)
    - `unit`: string (required) — e.g., `kg`, `each`
    - `unit_price`: decimal/numeric (required, >= 0) — purchase cost per `unit`
    - `unit_size`: decimal/numeric (required, > 0) — quantity the unit represents (e.g. `1.0` = 1 kg)
    - `created_at`: timestamp with time zone (required)
    - `updated_at`: timestamp with time zone (optional)
  - DB suggestions: `uuid PRIMARY KEY`, `unit_size` as `numeric(12,4) NOT NULL`, and `numeric(12,4)` for prices with `CHECK (>=0)`.

- PreparedProduct
  - Description: Sellable product made from raw inputs (catalog item).
  - Fields:
    - `id`: UUID (PK, required)
    - `name`: string (required)
    - `price`: decimal/numeric (required, >= 0)
    - `unit`: string (required)
    - `recipe_notes`: text (optional)
    - `created_at`, `updated_at`: timestamps
  - DB suggestions: `price` numeric with `CHECK (>=0)`.

- Expense
  - Description: A purchase record for raw products (supplier invoice or purchase entry).
  - Fields:
    - `id`: UUID (PK, required)
    - `raw_product_id`: UUID (FK -> `RawProduct.id`, required)
    - `quantity`: decimal (required, > 0)
    - `unit_cost`: decimal (required, >= 0) — amounts are recorded in CRC (Costa Rican colones)
    - `purchased_at`: timestamp (required)
    - `notes`: text (optional)
    - `created_at`, `updated_at`: timestamps
  - DB suggestions: `REFERENCES raw_products(id) ON DELETE RESTRICT`, numeric with appropriate checks.

- Sale
  - Description: A customer-facing order grouping `SaleItem`s.
  - Fields:
    - `id`: UUID (PK, required)
    - `customer_name`: string (optional)
    - `status`: string (required) — allowed: `prepared`, `delivered`, `paid`, `cancelled` (Phase 1)
    - `total_amount`: decimal (required, >= 0) — derived but stored for Phase 1; backend must validate (amounts in CRC)
    - `created_at`, `updated_at`: timestamps
  - DB suggestions: `status` CHECK constraint (see allowed values), `total_amount` numeric with `CHECK (>=0)`.

- SaleItem
  - Description: Line item on a `Sale`, referencing a `PreparedProduct` and quantity sold.
  - Fields:
    - `id`: UUID (PK, required)
    - `sale_id`: UUID (FK -> `Sale.id`, required)
    - `prepared_product_id`: UUID (FK -> `PreparedProduct.id`, required)
    - `quantity`: decimal (required, > 0)
    - `unit_price`: decimal (required, >= 0) — captured at sale time
    - `line_total`: decimal (required, >= 0) — quantity * unit_price
    - `created_at`, `updated_at`: timestamps
  - DB suggestions: `sale_id` `ON DELETE CASCADE`, `prepared_product_id` `ON DELETE RESTRICT`.

Relationships
- `RawProduct` 1---* `Expense`: `Expense.raw_product_id` references `RawProduct.id`.
- `PreparedProduct` 1---* `SaleItem`: `SaleItem.prepared_product_id` references `PreparedProduct.id`.
- `Sale` 1---* `SaleItem`: `SaleItem.sale_id` references `Sale.id`.

Invariants / Business Rules
- Numeric invariants: prices/costs >= 0; quantities > 0.
- Sale totals: `Sale.total_amount === sum(SaleItem.line_total)` (backend validates and computes).
- Line totals: `SaleItem.line_total === SaleItem.quantity * SaleItem.unit_price` (backend computes; tolerate minimal rounding per DB numeric precision).
- Historical pricing: `SaleItem.unit_price` is stored at sale time and is independent from later `PreparedProduct.price` changes.
- Referential integrity: cannot create `Expense` or `SaleItem` referencing non-existent `RawProduct` / `PreparedProduct`.
- Delete semantics: restrict deletion of products that are referenced by historical records (Phase 1: `ON DELETE RESTRICT`).

Validation Rules
  - Field-level:
    - `id`: must be valid UUID.
    - `name`: non-empty string.
  - `unit_price`, `price`, `unit_cost`, `unit_price` (SaleItem): numeric, >= 0.
  - `quantity`: numeric, > 0.
  - `status`: one of `prepared`, `delivered`, `paid`, `cancelled`.
  - timestamps: valid ISO date-time strings.
- Cross-field / Cross-entity:
  - `Sale.total_amount === sum(SaleItem.line_total)`.
  - `SaleItem.line_total === SaleItem.quantity * SaleItem.unit_price`.
  - FK references must exist before creating dependent records.

JSON Schemas (Phase 1 minimal)
- RawProduct
```json
{ "type":"object", "required":["id","name","unit","unit_price","unit_size"], "properties":{ "id":{"type":"string","format":"uuid"}, "name":{"type":"string"}, "unit":{"type":"string"}, "unit_price":{"type":"number","minimum":0}, "unit_size":{"type":"number","minimum":0} } }
```
Example:
```json
{ "id":"a3f1e8b0-1c2d-4f5a-9e2b-1234567890ab", "name":"Raw Cashews", "unit":"kg", "unit_price":7.5, "unit_size":1.0 }
```

- PreparedProduct
```json
{ "type":"object", "required":["id","name","price","unit"], "properties":{ "id":{"type":"string","format":"uuid"}, "name":{"type":"string"}, "price":{"type":"number","minimum":0}, "unit":{"type":"string"}, "recipe_notes":{"type":"string"} } }
```
Example:
```json
{ "id":"b4c2f9d1-2d3e-5f6b-0a1c-abcdef123456", "name":"Salted Roasted Cashews", "price":12.0, "unit":"each" }
```

- Expense
```json
{ "type":"object", "required":["id","raw_product_id","quantity","unit_cost","purchased_at"], "properties":{ "id":{"type":"string","format":"uuid"}, "raw_product_id":{"type":"string","format":"uuid"}, "quantity":{"type":"number","exclusiveMinimum":0}, "unit_cost":{"type":"number","minimum":0}, "purchased_at":{"type":"string","format":"date-time"} } }
```
Example:
```json
{ "id":"c5d3f0a2-3e4f-6a7b-1b2c-012345abcdef", "raw_product_id":"a3f1e8b0-1c2d-4f5a-9e2b-1234567890ab", "quantity":50.0, "unit_cost":7000.0, "purchased_at":"2026-03-20T09:00:00Z" }
```

- Sale
```json
{ "type":"object", "required":["id","status","total_amount"], "properties":{ "id":{"type":"string","format":"uuid"}, "customer_name":{"type":"string"}, "status":{"type":"string","enum":["prepared","delivered","paid","cancelled"]}, "total_amount":{"type":"number","minimum":0} } }
```
Example:
```json
{ "id":"d6e4g1b3-4f5a-7b8c-2c3d-fedcba654321", "customer_name":"Alice", "status":"paid", "total_amount":36000.0 }
```

- SaleItem
```json
{ "type":"object", "required":["id","sale_id","prepared_product_id","quantity","unit_price","line_total"], "properties":{ "id":{"type":"string","format":"uuid"}, "sale_id":{"type":"string","format":"uuid"}, "prepared_product_id":{"type":"string","format":"uuid"}, "quantity":{"type":"number","exclusiveMinimum":0}, "unit_price":{"type":"number","minimum":0}, "line_total":{"type":"number","minimum":0} } }
```
Example:
```json
{ "id":"e7f5h2c4-5a6b-8c9d-3d4e-123abc456def", "sale_id":"d6e4g1b3-4f5a-7b8c-2c3d-fedcba654321", "prepared_product_id":"b4c2f9d1-2d3e-5f6b-0a1c-abcdef123456", "quantity":3, "unit_price":12.0, "line_total":36.0 }
```

**Backend Design (REST routes & example payloads)**
Principles: CRUD endpoints per aggregate; strict validation on writes; use transactions when creating `Sale` + `SaleItem`s.

Routes (examples):
- RawProduct
  - GET /api/raw-products
  - GET /api/raw-products/:id
  - POST /api/raw-products
    - Request:
      ```json
      { "name":"Raw Cashews", "unit":"kg", "unit_price":7.5, "unit_size":1.0 }
      ```
    - Response (201):
      ```json
      { "id":"a3f1e8b0-1c2d-4f5a-9e2b-1234567890ab", "name":"Raw Cashews", "unit":"kg", "unit_price":7.5, "unit_size":1.0, "created_at":"2026-03-23T12:00:00Z" }
      ```

- PreparedProduct
  - GET /api/products
  - GET /api/products/:id
  - POST /api/products
    - Request:
      ```json
      { "name":"Salted Roasted Cashews", "price":12.0, "unit":"each", "recipe_notes":"Roast 10m at 180C" }
      ```
    - Response (201):
      ```json
      { "id":"b4c2f9d1-2d3e-5f6b-0a1c-abcdef123456", "name":"Salted Roasted Cashews", "price":12.0, "unit":"each", "created_at":"2026-03-23T12:01:00Z" }
      ```

- Expense
  - GET /api/expenses
  - GET /api/expenses/:id
  - POST /api/expenses
    - Request:
      ```json
      { "raw_product_id":"a3f1e8b0-1c2d-4f5a-9e2b-1234567890ab", "quantity":50.0, "unit_cost":7000.0, "purchased_at":"2026-03-20T09:00:00Z" }
      ```
    - Response (201):
      ```json
      { "id":"c5d3f0a2-3e4f-6a7b-1b2c-012345abcdef", "raw_product_id":"a3f1e8b0-1c2d-4f5a-9e2b-1234567890ab", "quantity":50.0, "unit_cost":7000.0, "purchased_at":"2026-03-20T09:00:00Z", "created_at":"2026-03-20T09:01:00Z" }
      ```

- Sale & SaleItem
  - GET /api/sales
  - GET /api/sales/:id
  - POST /api/sales
    - Request (create sale with items):
      ```json
      {
        "customer_name":"Alice",
        "status":"prepared",
        "items":[
          { "prepared_product_id":"b4c2f9d1-2d3e-5f6b-0a1c-abcdef123456", "quantity":3, "unit_price":12.0 },
          { "prepared_product_id":"b4c2f9d1-2d3e-5f6b-0a1c-abcdef123457", "quantity":1, "unit_price":5.0 }
        ]
      }
      ```
    - Backend responsibilities when handling POST /api/sales:
      - Validate each `prepared_product_id` exists.
      - Compute each `line_total = quantity * unit_price` with DB numeric precision.
      - Compute `total_amount = sum(line_total)` and compare to any provided total (if provided) or set it.
      - Persist `Sale` row and `SaleItem` rows in a transaction. Return created aggregate with items.
    - Response (201):
      ```json
      {
        "id":"d6e4g1b3-4f5a-7b8c-2c3d-fedcba654321",
        "customer_name":"Alice",
        "status":"prepared",
        "total_amount":41.0,
        "items":[
          { "id":"e7f5h2c4-5a6b-8c9d-3d4e-123abc456def", "prepared_product_id":"b4c2f9d1-2d3e-5f6b-0a1c-abcdef123456", "quantity":3, "unit_price":12.0, "line_total":36.0 },
          { "id":"e7f5h2c4-5a6b-8c9d-3d4e-123abc456fee", "prepared_product_id":"b4c2f9d1-2d3e-5f6b-0a1c-abcdef123457", "quantity":1, "unit_price":5.0, "line_total":5.0 }
        ],
        "created_at":"2026-03-23T12:05:00Z"
      }
      ```

Validation & error handling notes
- Return `400` for validation errors with a machine-readable body listing field errors.
- Return `404` when referenced FK is missing.
- Return `409` for uniqueness violations (e.g., duplicate unique field values).
- Use `numeric` DB types to avoid float precision issues; do arithmetic in DB or with a decimal-aware library.

**Frontend Design**
- Pages / Screens
  - Dashboard (KPIs)
  - Raw Materials (list, create/edit, detail)
  - Products (list, create/edit, detail)
  - Expenses (list, create)
  - Sales (list, create order flow, detail)
  - Settings (basic app settings)

- Components
  - `EntityTable` — lists with sort/pagination
  - `EntityForm` — reusable create/edit form (fields, validation hooks)
  - `OrderBuilder` — UI to add `PreparedProduct` items, set quantities/unit_prices, and compute totals
  - `Amount` — display with configured decimals and currency label (CRC)
  - `ConfirmDialog` — generic confirmation modal

- Minimal UI flow example: Create Sale (with items)
  1. Developer opens `Sales -> Create` screen (OrderBuilder visible).
  2. User searches/selects `PreparedProduct` and adds it to the order; sets `quantity` and `unit_price` (pre-filled from product but editable).
  3. OrderBuilder displays each line's `line_total` = `quantity * unit_price` and a running `total_amount` (client-side computed).
  4. User sets `customer_name` (optional) and clicks `Submit`.
  5. Frontend sends POST `/api/sales` with `items` array (see backend example). Frontend must handle validation errors from backend and show field-level messages.

Frontend validation expectations
- Validate required fields and numeric ranges client-side (quantity > 0, prices >= 0).
- Display server-side errors from the API in context (per-field or global).
  - Show CRC label alongside amounts and format to two decimals in displays; allow full precision in edit fields.

**Acceptance Criteria**
- Domain definitions exist for `RawProduct`, `PreparedProduct`, `Expense`, `Sale`, `SaleItem` with fields, types, and DB suggestions.
- Relationships and invariants are documented (sale totals and line totals computed and validated by backend).
- JSON schemas and example instances provided for each entity.
- Backend design includes example REST routes and example create/read payloads for each entity; backend notes explain transactions and validations.
- Frontend design lists pages, components, and shows the `Create Sale` UI flow with expected client/server interactions.

**Notes for Backend Agent**
- Enforce field-level validations and types on all write endpoints; return `400` with structured errors for invalid input.
- Enforce cross-entity invariants on `POST /api/sales`: compute and persist `SaleItem.line_total` and `Sale.total_amount` in a transaction; reject inconsistent totals.
- Validate FK existence before insert; return `404` for missing references.
- Use `numeric`/`decimal` with consistent precision (suggest `numeric(14,4)` for totals) and perform arithmetic in DB or with a decimal-aware library.
- Persist captured `unit_price` on `SaleItem` to preserve historical prices.
- Use `ON DELETE RESTRICT` for product tables that are referenced by historical `SaleItem`s; cascade `SaleItem` on `Sale` deletion.

**Notes for Frontend Agent**
- Implement client-side validation mirroring backend rules (required fields, numeric ranges) and show friendly messages.
- When creating `Sale`, compute line totals and total_amount client-side for UX, but rely on backend validation for canonical truth.
- Handle API validation errors (field-level and aggregate) and present them inline.
  - Show unit labels next to quantity and price inputs; show CRC consistently.

--

Generated by Domain Agent for Phase 1 (Foundation).
