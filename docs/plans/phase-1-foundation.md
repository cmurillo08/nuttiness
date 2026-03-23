---
phase: 1
title: Foundation
summary: Establish project structure, base domain entities, initial DB sketch and app layout for the Next.js DDD-lite monolith.
---

## 1. Overview

What: Define a minimal, testable foundation for the nuttiness app: a Next.js (App Router) monolithic layout, core domain entities (raw products, prepared products, expenses, sales), and a high-level database design.

Why: The repo uses a spec-driven, DDD-lite workflow (see [.github/agents/architect.agent.md](.github/agents/architect.agent.md)). This phase creates the single source of truth other agents will implement.

Files reviewed
- Example spreadsheets: [docs/spreedsheat-examples/expenses list.png](docs/spreedsheat-examples/expenses%20list.png), [docs/spreedsheat-examples/product lists:raw product list.png](docs/spreedsheat-examples/product%20lists%3Araw%20product%20list.png), [docs/spreedsheat-examples/sales:order lists.png](docs/spreedsheat-examples/sales%3Aorder%20lists.png)

## 2. Scope

Included
- Project layout for a Next.js App Router app.
- Base domain entities and their key fields (no business-rule implementation).
- High-level database tables/collections and primary relationships.
- Initial app layout (navigation, pages, minimal screens).

Not included
- Implementation code (API handlers, database migrations, UI components).
- Detailed business rules, inventory algorithms, pricing rules — those live in Phase 2+ and are authored by the Domain Agent.

## 3. Domain Model (high-level)

Entities
- RawProduct
  - id (uuid)
  - name (string)
  - unit (string) e.g. kg, lb
  - cost_price (decimal) optional
  - unit_size (decimal) optional (e.g. 1.0 meaning 1 kg)
  - supplier_id (nullable)

PreparedProduct
  - id (uuid)
  - name (string)
  - sku (string) optional
  - cost_price (decimal) optional  # manual entry, not derived from RawProduct
  - sale_price (decimal)
  
Notes: `PreparedProduct` is the sellable catalog. Cost and profit are recorded manually; no automatic linkage to `RawProduct` in Phase 1. No inventory is tracked in Phase 1.

- Expense (purchase)
  - id (uuid)
  - date (date)
  - raw_product_id (uuid)
  - quantity (decimal)
  - total_cost (decimal)
  - supplier (string) or supplier_id

- Sale / Order
  - id (uuid)
  - date (date)
  - items: [{prepared_product_id, quantity, unit_price}]
  - total_amount (decimal)
  - customer (string) optional

/* Inventory is not tracked in Phase 1 — inventory-related entities removed. */

Relationships
- Expenses record purchases of `RawProduct` (purchase price history only).
- Sales record sold `PreparedProduct` items. No inventory adjustments are made in this phase.

## 4. Initial Database Design (high-level)

- Persistence: Relational (Postgres) — Phase 1 will use Postgres. Design expressed as tables:
- raw_products (id, name, unit, cost_price, unit_size, supplier_id, created_at, updated_at)
- prepared_products (id, name, sku, sale_price, created_at, updated_at)
- expenses (id, date, raw_product_id, quantity, total_cost, supplier, receipt_ref)
- sales (id, date, total_amount, customer, status)
- sale_items (sale_id, prepared_product_id, quantity, unit_price)

Primary keys: uuid. Currency/decimal fields: use numeric/decimal at persistence layer. Timestamps: created_at/updated_at.



## 5. Backend Design (high-level API contracts)

Principles
- RESTful CRUD endpoints for each aggregate.
- Keep domain rules in the Domain Agent outputs; backend enforces validations and persistence.

Suggested routes (examples)
- Raw products
  - GET /api/raw-products
  - GET /api/raw-products/:id
  - POST /api/raw-products {name, unit, unit_size, cost_price, supplier_id}
  - PUT /api/raw-products/:id
  - DELETE /api/raw-products/:id

- Prepared products
  - GET /api/products
  - POST /api/products {name, sku, sale_price, cost_price?}

- Expenses
  - GET /api/expenses
  - POST /api/expenses {date, raw_product_id, quantity, total_cost, supplier}

- Sales
  - GET /api/sales
  - POST /api/sales {date, items: [{prepared_product_id, quantity, unit_price}], customer}

Validation (high-level)
- Required fields: names, ids, prices.
- Prices must be positive numbers.

## 6. Frontend Design (pages & layout)

App layout
- Central layout using Next.js App Router with a top navigation and left module nav, styled with Tailwind CSS.
- Top-level nav entries: Dashboard, Products, Raw Materials, Expenses, Sales, Settings.

Pages / Screens
- Dashboard: KPIs (recent sales, recent purchases)
- Raw Materials (list, create/edit form, detail)
- Products (list, create/edit form)
- Expenses (list, create)
- Sales (create order flow, list orders)

Components (high-level)
- `EntityTable` for lists (sortable, paginated)
- `EntityForm` for create/edit (reusable fields)
- `OrderBuilder` to add items and calculate totals
- Styling: use Tailwind CSS utility classes for component styles.

User flows (examples)
- Add Raw Material → create RawProduct → optionally record Expense
- Create Prepared Product → create product record with manual cost/price
- Create Sale → add items → submit → record sale (no inventory adjustments in initial phases)

## 7. Acceptance Criteria (Phase 1)

- Project structure documented: `app/` layout, `api/` routes list, `domain/` placeholder described.
- Core entities and DB tables defined and committed as this spec file.
- Basic API contract listed for CRUD on raw products, products, expenses, sales.
- App layout/nav wireframe and page list present.
- Spec reviewed and approved by human (approval tokens: `approved` / `continue` / `proceed`).

## Spec Template Checklist

- Summary: 1–2 lines (top of file)
- API contract: example routes listed above
- Data model: tables + primary fields
- Validation rules: required fields + numeric constraints
- Minimal UI page list and components
- Acceptance tests: checklist above

## Next Steps (after approval)

- Architect records approval in the todo tool and instructs Domain Agent to produce entity definitions.
- Domain Agent authors domain spec (entities + detailed rules).

---
Stop: do NOT implement code. Wait for explicit human approval to proceed.
