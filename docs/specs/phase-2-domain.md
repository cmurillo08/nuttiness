---
phase: 2
title: Phase 2 — Products (Domain Specification)
summary: Canonical domain specification for Phase 2: product catalog (RawProduct, PreparedProduct), API contracts, frontend flows, JSON Schemas, and migration notes.
---

This document is the Domain Agent's canonical Phase 2 specification. It references Phase 1 canonical artifacts where appropriate (see `docs/specs/phase-1-domain.md` and existing Phase 1 migrations in `migrations/`).

**Overview**

Phase 2 defines the product domain: two primary entities (RawProduct and PreparedProduct), their core fields, API contracts for CRUD operations, frontend page/component surface area, JSON Schemas that validate example payloads, and a minimal DB migration checklist for fields introduced in this phase.

Notes:
- Follow Phase 1 conventions: single currency (CRC), numeric fields use guidance `numeric(12,4)`, primary keys are `uuid`, timestamps use `timestamptz` (ISO 8601 / `format: date-time`).
- This spec does not change Phase 1 canonical definitions; where Phase 1 already defined columns or naming, Phase 2 references them and proposes additive migrations only.

**Scope**

Included:
- Canonical entities: `RawProduct`, `PreparedProduct` (fields + types)
- Backend API contract (endpoints, request/response examples, validation rules)
- Frontend pages/components and user flows for product management
- JSON Schemas for `RawProduct` and `PreparedProduct` (include `required` fields and formats)
- DB migration checklist + example DDL for additive changes

Excluded:
- Inventory consumption algorithms, automatic cost rollups, promotions/discounts (deferred to later phases)

**Decision / naming summary (open items for Architect confirmation)**
- Phase 1 migration uses `raw_products.unit_price` (see `migrations/20260323_create_phase1_tables.sql`). To preserve Phase 1 canonical names we will continue to use `unit_price` for `RawProduct` purchase price. (Decision: use `unit_price` — Architect confirm if `purchase_price` alias required in API layer.)
- For `PreparedProduct` the DB currently stores `price` (selling price). Phase 2 introduces an optional `cost_price` field on `prepared_products` to capture manual per-item cost. (Decision: add `cost_price` column.)

**Domain Model**

Entity: RawProduct
- `id` (uuid) — primary identifier, format: uuid
- `name` (string) — display name, required
- `unit` (string) — unit of measure (e.g., "kg", "each"), required per Phase 1
- `unit_price` (numeric(12,4)) — canonical purchase/unit price recorded in Phase 1 (>= 0)
- `unit_size` (numeric(12,4)) — size of unit when relevant (from Phase 1)
- `supplier` (string) — optional vendor/supplier name
- `notes` (string) — optional freeform notes
- `created_at` (timestamptz), `updated_at` (timestamptz)

Entity: PreparedProduct
- `id` (uuid) — primary identifier, format: uuid
- `name` (string) — display name, required
- `unit` (string) — unit of measure (e.g., "portion", "each"), required per Phase 1
- `price` (numeric(12,4)) — selling price (>= 0), required
- `cost_price` (numeric(12,4)) — optional manual recorded cost for the item (>= 0). Introduced in Phase 2.
- `recipe_notes` (string) — optional notes describing components / preparation
- `created_at` (timestamptz), `updated_at` (timestamptz)

Relationship notes:
- In Phase 2 the `PreparedProduct` may include recipe notes and a planned recipe structure, but automatic recipe-based cost calculations are out-of-scope. Referential links to `raw_products` (recipe items) are deferred to Phase 3 unless the Backend Agent is asked to include a lightweight recipe table now.

**Backend Design**

Principles
- RESTful, idempotent where appropriate, server-side validation using JSON Schemas below.
- All monetary / numeric fields use `numeric(12,4)` guidance. API accepts numbers with up to 4 decimal places; backend enforces precision.

Routes (canonical)
- RawProducts
  - GET /api/raw-products — list
  - GET /api/raw-products/:id — get
  - POST /api/raw-products — create
  - PUT /api/raw-products/:id — update (full replace)
  - PATCH /api/raw-products/:id — partial update
  - DELETE /api/raw-products/:id — delete (soft delete not required by Phase 2)

- PreparedProducts
  - GET /api/products — list (prepared products)
  - GET /api/products/:id — get
  - POST /api/products — create
  - PUT /api/products/:id — update
  - PATCH /api/products/:id — partial update
  - DELETE /api/products/:id — delete

Request / Response examples

Create RawProduct — request

{
  "name": "Whole Wheat Flour",
  "unit": "kg",
  "unit_price": 3.2500,
  "unit_size": 1.0000,
  "supplier": "Local Mill",
  "notes": "Organic"
}

Create RawProduct — response (201)

{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Whole Wheat Flour",
  "unit": "kg",
  "unit_price": 3.2500,
  "unit_size": 1.0000,
  "supplier": "Local Mill",
  "notes": "Organic",
  "created_at": "2026-03-23T12:34:56Z"
}

Create PreparedProduct — request

{
  "name": "Sourdough Loaf",
  "unit": "each",
  "price": 4.5000,
  "cost_price": 2.1000,
  "recipe_notes": "Made from sourdough starter and flour"
}

Create PreparedProduct — response (201)

{
  "id": "9b2f3d18-3d6d-4b2a-a6ea-1c2b3d4e5f6a",
  "name": "Sourdough Loaf",
  "unit": "each",
  "price": 4.5000,
  "cost_price": 2.1000,
  "recipe_notes": "Made from sourdough starter and flour",
  "created_at": "2026-03-23T12:40:00Z"
}

Validation rules (server-side)
- `name`: required, non-empty string, max length 255
- `unit`: required, non-empty string, max length 64
- Monetary and quantity fields: numeric with up to 4 decimal places; must be >= 0; use `exclusiveMinimum` where > 0 required (e.g., quantities)
- `id` parameters: must be UUID format
- Reject unknown top-level properties by default (strict schema)

Error responses
- 400 Bad Request — schema validation errors (include a JSON body with `errors` array)
- 404 Not Found — resource missing
- 409 Conflict — uniqueness / constraint errors (e.g., duplicate SKU if implemented)

Security & misc
- No authentication rules specified in Phase 2; backend should assume standard auth middleware handled elsewhere.

**Frontend Design (pages, components, flows)**

Pages
- /raw-materials — list `RawProduct` with search and quick-add
- /raw-materials/new — create raw product form
- /raw-materials/[id] — detail and edit raw product

- /products — list of `PreparedProduct` (name, price, cost_price, margin)
- /products/new — create prepared product form
- /products/[id] — product detail + edit

Components
- `EntityTable` — reusable table for listing (used for raw-products and products)
- `EntityForm` — used for create/edit flows (fields driven by schema)
- `Amount` — currency display (CRC) with 2–4 decimal rendering as needed
- `ConfirmDialog` — deletion confirmations

Flows
- Create product: open `EntityForm`, fields validated client-side with the same JSON Schema rules, POST to backend, on success redirect to list.
- Edit product: load resource via GET, populate `EntityForm`, submit PUT/PATCH.

Accessibility & style
- Use Tailwind and existing design tokens; forms must be keyboard accessible and label each input.

**JSON Schemas**

RawProduct JSON Schema (v1)

{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "RawProduct",
  "type": "object",
  "additionalProperties": false,
  "required": ["name","unit","unit_price","unit_size"],
  "properties": {
    "id": {"type":"string","format":"uuid"},
    "name": {"type":"string","minLength":1,"maxLength":255},
    "unit": {"type":"string","minLength":1,"maxLength":64},
    "unit_price": {"type":"number","multipleOf":0.0001,"minimum":0,"exclusiveMinimum":0},
    "unit_size": {"type":"number","multipleOf":0.0001,"exclusiveMinimum":0},
    "supplier": {"type":"string","maxLength":255},
    "notes": {"type":"string"},
    "created_at": {"type":"string","format":"date-time"},
    "updated_at": {"type":"string","format":"date-time"}
  }
}

PreparedProduct JSON Schema (v1)

{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PreparedProduct",
  "type": "object",
  "additionalProperties": false,
  "required": ["name","unit","price"],
  "properties": {
    "id": {"type":"string","format":"uuid"},
    "name": {"type":"string","minLength":1,"maxLength":255},
    "unit": {"type":"string","minLength":1,"maxLength":64},
    "price": {"type":"number","multipleOf":0.0001,"minimum":0},
    "cost_price": {"type":"number","multipleOf":0.0001,"minimum":0},
    "recipe_notes": {"type":"string"},
    "created_at": {"type":"string","format":"date-time"},
    "updated_at": {"type":"string","format":"date-time"}
  }
}

Notes on JSON Schema choices:
- `multipleOf: 0.0001` enforces up to 4 decimal places to align with `numeric(12,4)`.
- Where a field must be strictly > 0 (e.g., `unit_size`) we use `exclusiveMinimum: 0`.

**DB Migration Checklist (Phase 2 additive changes)**

1. Inspect existing Phase 1 tables and reuse columns where appropriate. Phase 1 already defines `raw_products` and `prepared_products` (see `migrations/20260323_create_phase1_tables.sql`).
2. Add nullable `cost_price` to `prepared_products` to capture manual cost entries.
3. Optionally add `supplier` to `raw_products` if Phase 1 does not have it (migration below checks existence before adding).
4. Add indexes for commonly queried fields (name lower-case index exists in Phase 1 migrations; replicate pattern if new columns introduced).

Example SQL DDL snippets (additive)

-- Add cost_price to prepared_products (nullable, default 0.0000 optional)
ALTER TABLE prepared_products
  ADD COLUMN IF NOT EXISTS cost_price numeric(12,4) DEFAULT 0.0000 CHECK (cost_price >= 0);

-- Optionally add supplier to raw_products
ALTER TABLE raw_products
  ADD COLUMN IF NOT EXISTS supplier text;

-- If you need a lightweight recipe table now (optional, recommended in Phase 3):
CREATE TABLE IF NOT EXISTS prepared_product_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prepared_product_id uuid NOT NULL REFERENCES prepared_products(id) ON DELETE CASCADE,
  raw_product_id uuid NOT NULL REFERENCES raw_products(id) ON DELETE RESTRICT,
  quantity numeric(12,4) NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

Migration notes:
- All additive migrations should be run inside a transaction. Test on staging DB before applying to production.
- Avoid changing or dropping Phase 1 columns (`unit_price`, `unit_size`, `price`) to preserve canonical Phase 1 schema.

**Acceptance Criteria**

- Documented `RawProduct` and `PreparedProduct` entities with fields, types, and JSON Schemas present in this file.
- Backend API contract: CRUD endpoints and example request/response payloads for raw and prepared products.
- Frontend pages and components described for product management flows.
- JSON Schemas include `required` fields, `format: uuid` and `format: date-time` where applicable, and numeric constraints (`multipleOf`, `minimum`, `exclusiveMinimum`) to align with `numeric(12,4)` guidance.
- DB migration checklist and DDL snippets included for additive changes (e.g., `cost_price`).

**Open items for Architect confirmation**
- Confirm acceptance of `unit_price` as the canonical `RawProduct` purchase price (Phase 1 uses `unit_price` — should APIs surface an alias `purchase_price`?).
- Confirm we should add `cost_price` to `prepared_products` in Phase 2 (this spec proposes it as optional and additive).
- Decide whether a lightweight `prepared_product_recipes` table should be created in Phase 2 (the file includes an optional DDL snippet; otherwise defer to Phase 3).

If the Architect confirms the open items above with `approved` or `continue`, the Domain Agent will finalize any small naming aliases and hand off to the Backend Agent for additive migrations and API implementation.

---

File: docs/specs/phase-2-domain.md
