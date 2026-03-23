# Phase 1 — Domain Definitions (Foundation)

Overview
- Core domain definitions for Phase 1: products, expenses, and sales entities and rules.

Entities

1) RawProduct
- Description: Purchased ingredient or raw input (e.g., cashews, sugar).
- Fields:
  - id: uuid (required) — example: "a3f1e8b0-1c2d-4f5a-9e2b-1234567890ab"
  - sku: string (required, unique) — example: "RAW-CASE-001"
  - name: string (required) — example: "Raw Cashews"
  - unit: string (required) — example: "kg"
  - unit_price: decimal (required) — example: 7.50  
  - created_at: timestamp (required) — example: "2026-03-23T12:00:00Z"
  - updated_at: timestamp (optional)
- DB column suggestions:
  - id: `uuid PRIMARY KEY`
  - sku: `text NOT NULL UNIQUE`
  - name: `text NOT NULL`
  - unit: `text NOT NULL`
  - unit_price: `numeric(12,4) NOT NULL CHECK (unit_price >= 0)`
  - created_at: `timestamp with time zone NOT NULL DEFAULT now()`
  - updated_at: `timestamp with time zone`

2) PreparedProduct
- Description: Sellable product made from raw inputs (e.g., salted roasted cashews).
- Fields:
  - id: uuid (required) — example: "b4c2f9d1-2d3e-5f6b-0a1c-abcdef123456"
  - sku: string (required, unique) — example: "PREP-SALC-001"
  - name: string (required) — example: "Salted Roasted Cashews"
  - price: decimal (required) — example: 12.00
  - unit: string (required) — example: "each" or "kg"
  - recipe_notes: string (optional) — example: "Roast 10m at 180C"
  - created_at: timestamp (required)
  - updated_at: timestamp (optional)
- DB column suggestions:
  - id: `uuid PRIMARY KEY`
  - sku: `text NOT NULL UNIQUE`
  - name: `text NOT NULL`
  - price: `numeric(12,4) NOT NULL CHECK (price >= 0)`
  - unit: `text NOT NULL`
  - recipe_notes: `text`
  - created_at: `timestamp with time zone NOT NULL DEFAULT now()`
  - updated_at: `timestamp with time zone`

3) Expense
- Description: A purchase record for raw products (a supplier invoice or purchase entry).
- Fields:
  - id: uuid (required) — example: "c5d3f0a2-3e4f-6a7b-1b2c-012345abcdef"
  - raw_product_id: uuid (required, FK) — references `RawProduct.id`
  - quantity: decimal (required) — example: 50.0
  - unit_cost: decimal (required) — example: 7.25
  - currency: string (required) — example: "USD"
  - purchased_at: timestamp (required) — example: "2026-03-20T09:00:00Z"
  - notes: text (optional)
  - created_at: timestamp (required)
  - updated_at: timestamp (optional)
- DB column suggestions:
  - id: `uuid PRIMARY KEY`
  - raw_product_id: `uuid NOT NULL REFERENCES raw_products(id) ON DELETE RESTRICT`
  - quantity: `numeric(12,4) NOT NULL CHECK (quantity > 0)`
  - unit_cost: `numeric(12,4) NOT NULL CHECK (unit_cost >= 0)`
  - currency: `text NOT NULL`
  - purchased_at: `timestamp with time zone NOT NULL`
  - notes: `text`
  - created_at: `timestamp with time zone NOT NULL DEFAULT now()`
  - updated_at: `timestamp with time zone`

4) Sale
- Description: A customer-facing order that groups sale items.
- Fields:
  - id: uuid (required) — example: "d6e4g1b3-4f5a-7b8c-2c3d-fedcba654321"
  - customer_name: string (optional) — example: "Alice"
  - status: string (required) — example: "draft" | "completed" (Phase 1: limited states)
  - total_amount: decimal (required) — example: 36.00 (derived but stored for Phase 1)
  - currency: string (required) — example: "USD"
  - created_at: timestamp (required)
  - updated_at: timestamp (optional)
- DB column suggestions:
  - id: `uuid PRIMARY KEY`
  - customer_name: `text`
  - status: `text NOT NULL CHECK (status IN ('draft','completed')) DEFAULT 'draft'`
  - total_amount: `numeric(12,4) NOT NULL CHECK (total_amount >= 0)`
  - currency: `text NOT NULL`
  - created_at: `timestamp with time zone NOT NULL DEFAULT now()`
  - updated_at: `timestamp with time zone`

5) SaleItem
- Description: Line item on a `Sale`, referencing a `PreparedProduct` and quantity sold.
- Fields:
  - id: uuid (required) — example: "e7f5h2c4-5a6b-8c9d-3d4e-123abc456def"
  - sale_id: uuid (required, FK) — references `Sale.id`
  - prepared_product_id: uuid (required, FK) — references `PreparedProduct.id`
  - quantity: decimal (required) — example: 3
  - unit_price: decimal (required) — example: 12.00 (captured from product at sale time)
  - line_total: decimal (required) — example: 36.00 (quantity * unit_price)
  - created_at: timestamp (required)
  - updated_at: timestamp (optional)
- DB column suggestions:
  - id: `uuid PRIMARY KEY`
  - sale_id: `uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE`
  - prepared_product_id: `uuid NOT NULL REFERENCES prepared_products(id) ON DELETE RESTRICT`
  - quantity: `numeric(12,4) NOT NULL CHECK (quantity > 0)`
  - unit_price: `numeric(12,4) NOT NULL CHECK (unit_price >= 0)`
  - line_total: `numeric(14,4) NOT NULL CHECK (line_total >= 0)`
  - created_at: `timestamp with time zone NOT NULL DEFAULT now()`
  - updated_at: `timestamp with time zone`


Relationships
- RawProduct 1---* Expense
  - `Expense.raw_product_id` → `RawProduct.id` (one raw product can have many purchases).
- Sale 1---* SaleItem
  - `SaleItem.sale_id` → `Sale.id` (one sale contains many line items).
- PreparedProduct 1---* SaleItem
  - `SaleItem.prepared_product_id` → `PreparedProduct.id` (a prepared product can appear on many sale items).

Cardinality summary:
- RawProduct (1) to Expense (N)
- Sale (1) to SaleItem (N)
- PreparedProduct (1) to SaleItem (N)


Invariants / Business Rules (Phase 1)
- Prices and costs must be >= 0.
- Quantities must be > 0.
- Sale `total_amount` must equal sum of its `SaleItem.line_total` values (backend should validate and populate).
- `SaleItem.unit_price` is captured at sale time and may differ from `PreparedProduct.price` later.
- `Expense.unit_cost` represents the cost per `unit` of the referenced `RawProduct` at purchase time.
- Deleting a `PreparedProduct` that appears in historical `SaleItem` should be restricted (use soft-delete later); for Phase 1 use `ON DELETE RESTRICT`.

Validation Rules
Field-level validations:
- `id`: valid UUID format.
- `sku`: non-empty string, unique per product table.
- `name`: non-empty string.
- `unit_price`, `price`, `unit_cost`, `unit_price` (SaleItem): numeric, >= 0.
- `quantity`: numeric, > 0.
- `currency`: ISO 4217 three-letter code (basic check: length == 3, uppercase).
- `status`: one of the allowed values (`draft`, `completed`).
- `created_at`, `purchased_at`: valid ISO timestamps.

Cross-field / cross-entity validations:
- `Sale.total_amount === sum(SaleItem.line_total)`.
- `SaleItem.line_total === SaleItem.quantity * SaleItem.unit_price` (allow small rounding tolerance when using decimal types).
- `Expense.raw_product_id` must reference an existing `RawProduct`.
- `SaleItem.prepared_product_id` must reference an existing `PreparedProduct`.


JSON Schemas (minimal)

- RawProduct (minimal)
```json
{ "type":"object", "required":["id","sku","name","unit","unit_price"], "properties":{ "id":{"type":"string","format":"uuid"}, "sku":{"type":"string"}, "name":{"type":"string"}, "unit":{"type":"string"}, "unit_price":{"type":"number","minimum":0} } }
```
Example instance:
```json
{ "id":"a3f1e8b0-1c2d-4f5a-9e2b-1234567890ab", "sku":"RAW-CASE-001", "name":"Raw Cashews", "unit":"kg", "unit_price":7.5 }
```

- PreparedProduct (minimal)
```json
{ "type":"object", "required":["id","sku","name","price","unit"], "properties":{ "id":{"type":"string","format":"uuid"}, "sku":{"type":"string"}, "name":{"type":"string"}, "price":{"type":"number","minimum":0}, "unit":{"type":"string"} } }
```
Example instance:
```json
{ "id":"b4c2f9d1-2d3e-5f6b-0a1c-abcdef123456", "sku":"PREP-SALC-001", "name":"Salted Roasted Cashews", "price":12.0, "unit":"each" }
```

- Expense (minimal)
```json
{ "type":"object", "required":["id","raw_product_id","quantity","unit_cost","currency","purchased_at"], "properties":{ "id":{"type":"string","format":"uuid"}, "raw_product_id":{"type":"string","format":"uuid"}, "quantity":{"type":"number","exclusiveMinimum":0}, "unit_cost":{"type":"number","minimum":0}, "currency":{"type":"string"}, "purchased_at":{"type":"string","format":"date-time"} } }
```
Example instance:
```json
{ "id":"c5d3f0a2-3e4f-6a7b-1b2c-012345abcdef", "raw_product_id":"a3f1e8b0-1c2d-4f5a-9e2b-1234567890ab", "quantity":50.0, "unit_cost":7.25, "currency":"USD", "purchased_at":"2026-03-20T09:00:00Z" }
```

- Sale (minimal)
```json
{ "type":"object", "required":["id","status","total_amount","currency"], "properties":{ "id":{"type":"string","format":"uuid"}, "status":{"type":"string"}, "total_amount":{"type":"number","minimum":0}, "currency":{"type":"string"} } }
```
Example instance:
```json
{ "id":"d6e4g1b3-4f5a-7b8c-2c3d-fedcba654321", "customer_name":"Alice", "status":"completed", "total_amount":36.0, "currency":"USD" }
```

- SaleItem (minimal)
```json
{ "type":"object", "required":["id","sale_id","prepared_product_id","quantity","unit_price","line_total"], "properties":{ "id":{"type":"string","format":"uuid"}, "sale_id":{"type":"string","format":"uuid"}, "prepared_product_id":{"type":"string","format":"uuid"}, "quantity":{"type":"number","exclusiveMinimum":0}, "unit_price":{"type":"number","minimum":0}, "line_total":{"type":"number","minimum":0} } }
```
Example instance:
```json
{ "id":"e7f5h2c4-5a6b-8c9d-3d4e-123abc456def", "sale_id":"d6e4g1b3-4f5a-7b8c-2c3d-fedcba654321", "prepared_product_id":"b4c2f9d1-2d3e-5f6b-0a1c-abcdef123456", "quantity":3, "unit_price":12.0, "line_total":36.0 }
```


Notes for Backend Agent
- Enforce field-level validations (types, required, numeric ranges) on write operations.
- Enforce cross-entity invariants:
  - Validate and compute `SaleItem.line_total = quantity * unit_price` and `Sale.total_amount = sum(line_total)`; reject inconsistent totals.
  - Ensure referenced FKs exist before creating `Expense` or `SaleItem`.
- Persist primary fields; store captured `unit_price` on `SaleItem` to keep historical price.
- Use transactions when creating a `Sale` with `SaleItem`s to ensure atomicity.
- Use `numeric`/`decimal` database types to avoid float rounding issues; apply consistent scale (e.g., 4 decimal places).
- For deletes, prefer `ON DELETE RESTRICT` for product records referenced by historical data; cascade `SaleItem` on `Sale` deletion.

Notes for Frontend Agent
- UI validation hints:
  - Show required field markers for `sku`, `name`, `price`, `quantity`, `currency`.
  - Validate numeric inputs client-side (non-negative, quantity > 0) and present friendly errors.
  - When editing a `PreparedProduct`, warn that existing historical `SaleItem`s will not change.
- Display expectations:
  - Show `Sale` totals computed from line items; show currency next to amounts.
  - Display `unit` near quantity and unit price fields.
  - Prefer displaying two decimal places for currencies; however display full precision when editing.

Acceptance Criteria (phase-level)
- Domain definitions present for `RawProduct`, `PreparedProduct`, `Expense`, `Sale`, `SaleItem` with fields and DB suggestions.
- Business rules cover price/quantity invariants and sale totals validation.
- JSON schema examples and one example instance exist for each entity.
- Backend/Frontend notes clearly list validations to enforce and UI expectations.

Domain-specific acceptance checks
- Creating a `Sale` with items: backend can validate computed totals and reject mismatch.
- Creating an `Expense` must reference an existing `RawProduct`.
- `unit_price` for a `SaleItem` is captured and persisted even if `PreparedProduct.price` changes later.

--

Generated by Domain Agent for Phase 1 (Foundation).
