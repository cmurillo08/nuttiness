---
phase: 5
title: Phase 5 — Domain Spec (Customer Management)
summary: Domain specification for Phase 5: Customer entity with CRUD operations, customer-to-sales relationships, API contracts, validation rules, and frontend components for customer selection in order workflows.
---

**Overview**
- Customer Management extends Phase 4 (Sales) by introducing a managed `Customer` entity to replace free-form text entry for customer names in sales orders.
- Customers can be created, read, updated, and deleted through a dedicated management interface.
- Sales orders are linked to customers via a foreign key, enabling better tracking and reporting of customer activity.

**Scope**
- Included: canonical entity definition for `Customer`, DB column suggestions, relationships with `Sale`, invariants/business rules, validation rules, JSON schemas, REST routes with example request/response payloads, and frontend pages/components (list, create/edit, detail, customer selector).
- Excluded: customer segmentation/categories, customer credit/payment history, customer activity/analytics, customer import/export, soft-delete semantics.

---

**Domain Model**

- Customer
  - Description: Represents a customer in the system (individual or entity purchasing prepared products).
  - Fields (types & constraints):
    - `id`: UUID (PK, required)
    - `name`: string (required, unique) — customer display name or business name
    - `phone`: string (optional) — contact phone number
    - `notes`: text (optional) — internal notes (e.g., delivery instructions, preferences)
    - `created_at`: timestamp with time zone (required)
    - `updated_at`: timestamp with time zone (required)
  - DB suggestions: `id` as `uuid PRIMARY KEY`, `name` as `varchar(255) UNIQUE NOT NULL`, `phone` as `varchar(20)`, `notes` as `text`, timestamps as `timestamp with time zone DEFAULT now()`.

- Sale (Modified from Phase 4)
  - Change: Add `customer_id` (optional FK -> `Customer.id`)
  - Rationale: Link sales to customers for better tracking; optional to maintain backward compatibility with legacy orders.
  - DB suggestion: `customer_id` as `uuid REFERENCES customers(id) ON DELETE SET NULL` (soft delete to preserve historical orders).

---

**Relationships**
- `Customer` 1---* `Sale`: `Sale.customer_id` references `Customer.id`.
  - Optionality: `Sale.customer_id` is optional (legacy sales may not have a customer).
  - On delete: `ON DELETE SET NULL` (preserve historical orders even if customer is deleted).

---

**Invariants / Business Rules**
- Uniqueness: `Customer.name` must be unique within the system (no duplicate customer names).
- Name requirement: `Customer.name` is non-empty and required.
- Historical preservation: If a customer is deleted, existing `Sale`s linked to that customer retain `customer_id = NULL` (no data loss).
- One customer per order: Each `Sale` is linked to at most one `Customer`.

---

**Validation Rules**
- Field-level:
  - `id`: must be valid UUID (system-generated).
  - `name`: non-empty string, max 255 characters; must be unique (backend enforces via DB constraint).
  - `phone`: optional; if provided, max 20 characters (basic international phone support).
  - `notes`: optional; if provided, max 5000 characters (reasonable text limit).
  - `created_at`, `updated_at`: valid ISO date-time strings (system-generated).
- Cross-entity:
  - `Sale.customer_id` must reference an existing `Customer.id` (FK constraint enforced by DB).

---

**JSON Schemas (Phase 5)**

- Customer
```json
{
  "type": "object",
  "required": ["id", "name", "created_at", "updated_at"],
  "properties": {
    "id": {"type": "string", "format": "uuid"},
    "name": {"type": "string", "minLength": 1, "maxLength": 255},
    "phone": {"type": "string", "maxLength": 20},
    "notes": {"type": "string", "maxLength": 5000},
    "created_at": {"type": "string", "format": "date-time"},
    "updated_at": {"type": "string", "format": "date-time"}
  }
}
```
Example:
```json
{
  "id": "f1a2b3c4-d5e6-4f7a-8b9c-1234567890ab",
  "name": "Café Central",
  "phone": "+506 2234 5678",
  "notes": "Prefers morning delivery. Uses PO #1001.",
  "created_at": "2026-03-23T14:00:00Z",
  "updated_at": "2026-03-23T14:00:00Z"
}
```

---

**Backend Design (REST routes & example payloads)**

Principles: CRUD endpoints for `Customer`; strict validation on writes; enforce uniqueness on `name`; maintain referential integrity with existing sales.

Routes:

- GET /api/customers
  - Description: List all customers.
  - Response (200):
    ```json
    {
      "customers": [
        {
          "id": "f1a2b3c4-d5e6-4f7a-8b9c-1234567890ab",
          "name": "Café Central",
          "phone": "+506 2234 5678",
          "notes": "Prefers morning delivery.",
          "created_at": "2026-03-23T14:00:00Z",
          "updated_at": "2026-03-23T14:00:00Z"
        },
        {
          "id": "e2b3c4d5-e6f7-5a8b-9c0d-234567890abc",
          "name": "Restaurant Las Playas",
          "phone": "+506 2555 7890",
          "notes": null,
          "created_at": "2026-03-23T15:30:00Z",
          "updated_at": "2026-03-23T15:30:00Z"
        }
      ]
    }
    ```

- POST /api/customers
  - Description: Create a new customer.
  - Request:
    ```json
    {
      "name": "Café Central",
      "phone": "+506 2234 5678",
      "notes": "Prefers morning delivery."
    }
    ```
  - Response (201):
    ```json
    {
      "id": "f1a2b3c4-d5e6-4f7a-8b9c-1234567890ab",
      "name": "Café Central",
      "phone": "+506 2234 5678",
      "notes": "Prefers morning delivery.",
      "created_at": "2026-03-23T14:00:00Z",
      "updated_at": "2026-03-23T14:00:00Z"
    }
    ```
  - Error cases:
    - `400` if `name` is missing or empty.
    - `409` if `name` already exists (uniqueness violation).
    - `400` if `phone` exceeds 20 characters or `notes` exceeds 5000 characters.

- GET /api/customers/:id
  - Description: Get a single customer by ID.
  - Response (200):
    ```json
    {
      "id": "f1a2b3c4-d5e6-4f7a-8b9c-1234567890ab",
      "name": "Café Central",
      "phone": "+506 2234 5678",
      "notes": "Prefers morning delivery.",
      "created_at": "2026-03-23T14:00:00Z",
      "updated_at": "2026-03-23T14:00:00Z"
    }
    ```
  - Error cases:
    - `404` if customer does not exist.

- PUT /api/customers/:id
  - Description: Update a customer (partial updates allowed).
  - Request:
    ```json
    {
      "name": "Café Central Nuevo",
      "phone": "+506 2234 5679",
      "notes": "Updated delivery instructions."
    }
    ```
  - Response (200):
    ```json
    {
      "id": "f1a2b3c4-d5e6-4f7a-8b9c-1234567890ab",
      "name": "Café Central Nuevo",
      "phone": "+506 2234 5679",
      "notes": "Updated delivery instructions.",
      "created_at": "2026-03-23T14:00:00Z",
      "updated_at": "2026-03-24T10:30:00Z"
    }
    ```
  - Error cases:
    - `404` if customer does not exist.
    - `409` if updated `name` conflicts with another customer's name.
    - `400` if validation fails (e.g., empty name, field length exceeded).

- DELETE /api/customers/:id
  - Description: Delete a customer. Existing sales linked to this customer have `customer_id` set to `NULL`.
  - Response (204): No content.
  - Error cases:
    - `404` if customer does not exist.

Validation & error handling notes
- Return `400` for validation errors with a machine-readable body listing field errors.
- Return `404` when customer does not exist.
- Return `409` for uniqueness violations (e.g., duplicate customer name).
- Return `204` on successful deletion (no body).

---

**Frontend Design**

- Pages / Screens
  - `/customers` — List all customers (table with name, phone, notes, created_at; actions: view, edit, delete).
  - `/customers/new` — Create a new customer (form: name, phone, notes).
  - `/customers/:id` — Edit customer (form: name, phone, notes; displays created_at, updated_at).

- Components
  - `CustomerTable` — (reuse `EntityTable`) renders list of customers with delete/edit actions.
  - `CustomerForm` — (reuse `EntityForm`) renders create/edit form for customer data.
  - `CustomerSelect` — Dropdown/autocomplete to select an existing customer or create inline (used in `OrderBuilder`).
  - `CustomerBadge` — Display customer name with optional secondary info (used in Sales list/detail to show linked customer).

- Minimal UI flow example: Create Sale with customer selection
  1. Developer opens `Sales -> Create` screen (OrderBuilder visible).
  2. OrderBuilder displays `CustomerSelect` dropdown at the top.
  3. User searches/selects an existing `Customer` from the dropdown (or types to filter by name).
  4. User adds `PreparedProduct` items and sets quantities/unit_prices (existing flow).
  5. OrderBuilder displays line totals and running total (existing flow).
  6. User clicks `Submit`.
  7. Frontend sends POST `/api/sales` with `customer_id` field (in addition to existing `items` array).
  8. Backend persists the sale linked to the selected customer.

- Dashboard update
  - Add a new card: `Total Customers` (displays count of all customers).

---

**Acceptance Criteria**
- [ ] Domain definition exists for `Customer` with fields, types, and DB suggestions.
- [ ] Relationship between `Customer` and `Sale` is documented (1---* with `ON DELETE SET NULL`).
- [ ] Invariants (uniqueness of name, optional FK on sales) are documented.
- [ ] Validation rules are documented (required fields, string lengths, uniqueness).
- [ ] JSON schemas and example instances provided for `Customer`.
- [ ] Backend design includes REST routes (GET, POST, PUT, DELETE) with example request/response payloads.
- [ ] Backend error handling is specified (400, 404, 409).
- [ ] Frontend design lists pages, components, and shows the `Create Sale with Customer` UI flow.
- [ ] Dashboard updated with customer count card.
- [ ] Database migration plan references the new `customers` table and modification to `sales` table (customer_id FK).

---

**Notes for Backend Agent**
- Create a new `customers` table with columns: `id` (UUID PK), `name` (VARCHAR 255, UNIQUE NOT NULL), `phone` (VARCHAR 20), `notes` (TEXT), `created_at` (TIMESTAMP DEFAULT now()), `updated_at` (TIMESTAMP DEFAULT now()).
- Modify `sales` table: Add `customer_id` (UUID, FK to `customers(id) ON DELETE SET NULL`).
- Enforce field-level validations on all write endpoints:
  - `name` is required, non-empty, max 255 characters, and unique (return 409 on conflict).
  - `phone` is optional but max 20 characters.
  - `notes` is optional but max 5000 characters.
- Return `400` with structured error messages for validation failures.
- Return `404` for missing customer IDs (GET, PUT, DELETE).
- Return `204` with no body on successful DELETE.
- On DELETE, rely on DB `ON DELETE SET NULL` to cascade; verify existing sales are unaffected (customer_id becomes NULL).
- Ensure timestamps are generated/updated by DB (e.g., `DEFAULT now()` on insert, trigger on update).

**Notes for Frontend Agent**
- Implement `CustomerForm` for create/edit (reusing `EntityForm` patterns from Phase 1).
- Implement `CustomerSelect` component as a searchable dropdown:
  - Fetch `/api/customers` on component mount.
  - Display customer names as options; filter by user input.
  - Allow user to select an existing customer or show a "Create new" button to open an inline modal.
- Update `OrderBuilder` to include `CustomerSelect` at the top of the form.
- Validate required fields (name) client-side before submission.
- Display server-side errors (uniqueness violations, validation) with friendly messages.
- Update the dashboard to fetch and display total customer count.
- Ensure customer name appears on Sales list/detail view (if customer_id is present, show customer name instead of free-form customer_name field).

---

Generated by Domain Agent for Phase 5 (Customer Management).
