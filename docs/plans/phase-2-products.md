---
phase: 2
title: Products
summary: Define product catalog (raw + prepared), product components/recipes, pricing, and API/UI contracts for product management.
---

## 1. Overview

What: Phase 2 focuses on the product domain: authoring precise product entities, handling product components (recipes), and defining the API + UI contracts for product management.

Why: Products are central to ordering and pricing. This phase creates the detailed spec Domain Agent will use to author business rules.

## 2. Scope

Included
- Detailed product entity definitions (RawProduct, PreparedProduct)
- API contract for product CRUD
- UI pages and component contracts for product listing and editing

Not included
- Inventory consumption algorithms (handled in Phase 3/Domain Agent)
- Complex pricing strategies (discounts, promotions) — out of scope for this phase

## 3. Domain Model (products)

Entities
- RawProduct
  - id (uuid)
  - name (string, required)
  - unit (string, optional)
  - purchase_price (decimal, optional)  # price paid when purchased; used by Expenses
  - supplier (string, optional)
  - notes: `RawProduct` is a purchase/catalog list used to record expenses. It is NOT linked to `PreparedProduct`.

- PreparedProduct
  - id (uuid)
  - name (string, required)
  - sku (string, optional)
  - cost_price (decimal, optional)  # manually entered cost for the item
  - sale_price (decimal, required)
  - notes: `PreparedProduct` is the sellable catalog. Cost and profit values are stored manually; no automatic recipe linkage to `RawProduct` in this phase.

Derived values (for later phases)
- Cost of goods for `PreparedProduct` may be computed from purchase history or manual fields; Domain Agent will formalize formulas in a later phase.

## 4. Backend Design (API)

Principles
- Keep RESTful endpoints; validation and referential checks in backend.

Routes & Example payloads

- List products
  - GET /api/products
  - Response: 200 [{id, name, sku, sale_price}]

-- Get product
  - GET /api/products/:id
  - Response: 200 {id, name, sku, sale_price, cost_price}

-- Create prepared product
  - POST /api/products
  - Request: {name, sku?, sale_price, cost_price?}
  - Response: 201 {id, ...}

-- Update product
  - PUT /api/products/:id
  - Request: same shape as create

-- Raw products CRUD (mirror endpoints)
  - GET /api/raw-products
  - POST /api/raw-products {name, unit, purchase_price, supplier}

Validation (high-level)
- `name` and `sale_price` required for `PreparedProduct`.
- Prices must be positive numbers.

## 5. Frontend Design (pages & components)

Styling
- Use Tailwind CSS utility classes for layout and component styling.

Pages
- /products — list of prepared products with filter/search
- /products/new — create product form
- /products/[id] — product detail and edit
- /raw-products — list and manage raw materials

Key components
- `ProductsTable` — shows name, sku, price, actions
- `ProductForm` — fields: name, sku, sale_price, cost_price

User flows
- Create prepared product: open `ProductForm`, enter price/cost fields, save → backend validates input.

## 6. Acceptance Criteria

- Domain Agent will produce detailed entity definitions for `RawProduct` and `PreparedProduct`.
- Backend API contract implemented for product CRUD (endpoints listed) — domain validations deferred to Domain Agent definitions.
- Frontend pages for listing and creating products described with required forms and flows.
- Spec reviewed and approved by human (approval tokens: `approved` / `continue` / `proceed`).

## Spec Template Checklist

- Summary: 1–2 lines
- API contract: example request/response for product routes
- Data model: required fields + types for product entities
- Validation rules: primary constraints (name, price, component refs)
- Minimal UI page list and components
- Acceptance tests: 3–5 checks above

## Next Steps (after approval)

- Architect records approval in the todo tool and instructs `Domain Agent` to author product entity definitions and business rules.
- After Domain Agent returns entities, `Backend Agent` will design DB migrations and API handlers (only after explicit approval).

---
Stop: do NOT implement code. Wait for explicit human approval to proceed.
