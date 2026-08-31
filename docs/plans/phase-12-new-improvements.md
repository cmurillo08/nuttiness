# Phase 12: New Improvements (Batch 1)

## Overview
A batch of seven small-to-medium improvements collected from real usage of the app. They are grouped into a single phase because they are being reviewed together, but each one is specified in its own numbered subsection so it can be approved, trimmed, or deferred independently.

The batch covers: a display relabel, two data-integrity fixes (integer quantities, calendar-date handling), two UX fixes (pagination after delete, deleting a mistaken sale), one cross-cutting list feature (sorting), and an extension of the reports area with three new aggregates.

Everything here builds on already-implemented phases 1–11 and follows the Phase 7 architecture (routes stay thin, SQL lives in `lib/db/queries/*`, multi-step writes live in `lib/services/*`).

## Objectives
1. Relabel "Unit" to "Unit Size" in raw product and prepared product views (display only).
2. Make `expenses.quantity` and `sale_items.quantity` integers end-to-end (DB, domain schema, API validation, UI).
3. Fix the expense date off-by-one bug caused by timezone-sensitive date round-tripping.
4. Guarantee lists refresh correctly after a delete, including the "last item on a page" edge case.
5. Allow deleting a sale while it is still in `ordered` status. **⚠️ Superseded — see [Addendum](#addendum-post-implementation-changes) at the end of this document: deletion was later opened up to any status.**
6. Add a consistent sorting contract (date + name) across all five list endpoints and the shared table UI.
7. Extend `/reports` with top products, top customers, and monthly sales, backed by indexed aggregate queries.

## Scope

### Included
- Display label changes on raw products and prepared products (`Unit` → `Unit Size`).
- Two new migrations: integer quantity conversion, and report/sort supporting indexes.
- Domain schema updates in `docs/specs/phase-1-domain.json` and matching updates in `lib/validators.js`.
- A shared app-layer calendar-date convention and helper for `purchased_at`.
- Pagination-aware delete behavior on all list pages.
- `DELETE /api/sales/[id]` restricted to `ordered` sales, plus UI affordances.
- `sort` / `order` query params on the five list endpoints and clickable sort headers in `EntityTable`.
- Three new report endpoints plus new `/reports` sections, including a dependency-free chart.

### NOT Included
- Splitting `unit` into a numeric size + unit-of-measure pair (explicitly rejected by the human; `unit` stays a free-text string column).
- Changing `cancelSale` semantics or the existing status lifecycle.
- Soft deletes / audit trail for deleted sales.
- Sorting by columns other than date and name (price, status, total, supplier are out of scope).
- Date-range filters or CSV/PDF export on reports.
- Changing the existing `GET /api/reports/summary` contract or the dashboard stats definition.
- Adding a charting npm dependency.
- Fixing the unrelated observation that `/expenses` sends a `raw_product_id` filter that `GET /api/expenses` currently ignores (noted below, not in scope).

---

## 1. Unit → "Unit Size" relabel

### 1.1 Decision
Display-label change only. The persisted column stays `raw_products.unit` / `prepared_products.unit` (free-text `text NOT NULL`), the JSON field stays `unit`, and no migration or API contract change is involved. This was explicitly confirmed by the human, who rejected splitting the field into numeric size + unit.

### 1.2 Backend
No changes. `docs/specs/phase-1-domain.json` keeps `unit` as-is for both `RawProduct` and `PreparedProduct`.

### 1.3 Frontend
Rename the visible label in exactly these places (verified in the current source):
- `app/raw-products/page.js` — column `{ key: "unit", label: "Unit" }` → `label: "Unit Size"`.
- `app/products/page.js` — column `{ key: "unit", label: "Unit" }` → `label: "Unit Size"`.
- `components/RawProductForm.jsx` — field `{ name: "unit", label: "Unit", hint: "e.g., 910g" }` → `label: "Unit Size"` (keep the hint).
- `components/ProductForm.jsx` — field `{ name: "unit", label: "Unit", hint: "e.g., 250g" }` → `label: "Unit Size"` (keep the hint).

Leave alone (no "Unit" label is shown, the value is only appended inline):
- `components/PreparedProductSelect.jsx` (`{name} - {unit}`)
- `app/sales/[id]/page.js` line-item product cell (`{product_name} - {unit}`)
- Every "Unit Price" label — that is a different concept and must not be renamed.

### 1.4 Acceptance
- [ ] `/raw-products` and `/products` list headers (desktop table and mobile card `dt`) read "Unit Size".
- [ ] Raw product and product create/edit forms label the field "Unit Size".
- [ ] No "Unit Price" label was renamed.
- [ ] No API payload key changed; `GET /api/products` still returns `unit`.

---

## 2. Integer quantities (expenses + sale items)

### 2.1 Domain rule
`Expense.quantity` and `SaleItem.quantity` are **counts of whole units purchased/sold** and must be integers `>= 1`. Fractional weights are already expressed through the product's `unit` ("Unit Size", e.g. `910g`), so a fractional count has no business meaning.

Money fields (`cost`, `unit_price`, `line_total`, `total_amount`) stay `numeric(12,2)` and are unaffected.

### 2.2 Current state (verified)
- `migrations/20260323_create_phase1_tables.sql`: `expenses.quantity numeric(12,2) NOT NULL CHECK (quantity > 0)` and `sale_items.quantity numeric(12,2) NOT NULL CHECK (quantity > 0)`.
- `docs/specs/phase-1-domain.json`: `Expense.quantity`, `SaleItemCreate.quantity`, `SaleItem.quantity` are all `{ "type": "number", "exclusiveMinimum": 0 }`.
- `lib/validators.js` does **not** read the Expense/Sale definitions from `phase-1-domain.json` — it declares its own inline `ExpenseDef` and `CreateSaleItemSchema`. Both must be edited too, otherwise the domain file change has no runtime effect.
- Runtime fallbacks (`app/api/expenses/route.js`, `app/api/expenses/[id]/route.js`, `lib/services/sales.js#normalizeSaleLines`, `app/api/sales/[id]/items/[itemId]/route.js`) only check `> 0`.
- UI: `components/ExpenseForm.jsx` quantity input has `min="1"` but no `step`; `components/OrderBuilder.jsx` line editor uses `step="0.01" min="0"`; `app/sales/[id]/page.js` edit inputs use `min="1"` with no `step`.

### 2.3 Migration — `migrations/20260829_integer_quantities.sql`

```sql
-- Phase 12: expenses.quantity and sale_items.quantity become integers.
BEGIN;

-- 1) Safety gate: refuse to convert if fractional data exists.
DO $$
DECLARE
  bad_expenses bigint;
  bad_sale_items bigint;
BEGIN
  SELECT COUNT(*) INTO bad_expenses   FROM expenses   WHERE quantity <> trunc(quantity);
  SELECT COUNT(*) INTO bad_sale_items FROM sale_items WHERE quantity <> trunc(quantity);

  IF bad_expenses > 0 OR bad_sale_items > 0 THEN
    RAISE EXCEPTION
      'Fractional quantities found (expenses: %, sale_items: %). Resolve them manually before running this migration.',
      bad_expenses, bad_sale_items;
  END IF;
END $$;

-- 2) expenses.quantity -> integer (no-op when already converted)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'quantity' AND data_type <> 'integer'
  ) THEN
    ALTER TABLE expenses ALTER COLUMN quantity TYPE integer USING quantity::integer;
  END IF;
END $$;

-- 3) sale_items.quantity -> integer (no-op when already converted)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sale_items' AND column_name = 'quantity' AND data_type <> 'integer'
  ) THEN
    ALTER TABLE sale_items ALTER COLUMN quantity TYPE integer USING quantity::integer;
  END IF;
END $$;

COMMIT;
```

Notes for the implementer:
- The existing unnamed `CHECK (quantity > 0)` constraints are preserved and re-validated by `ALTER COLUMN ... TYPE`; do not drop or recreate them.
- The migration is idempotent (safe to re-run), per the Phase 11 requirement.

### 2.4 Production consideration: existing fractional rows (explicit decision)
The dev database may be empty, but production (Neon) is not necessarily. **Default behavior of this migration is to abort, not to round.** Reasoning:
- `expenses.cost` is stored as `unit price × quantity` (computed in `ExpenseForm`), and `sale_items.line_total` is `quantity × unit_price`, which also rolls up into `sales.total_amount`.
- Rounding a quantity silently desynchronizes those stored money values, i.e. it rewrites financial history without anyone noticing.

If the abort fires, remediation is a human decision, executed as a separate, reviewed script — not folded into this migration:
- **Option A (preferred):** correct the offending rows by hand (they are expected to be very few), re-entering the intended whole quantity and the intended cost/total.
- **Option B (bulk round):** round the quantity **and** recompute the dependent totals in the same transaction, e.g. `UPDATE sale_items SET quantity = ROUND(quantity), line_total = ROUND(quantity) * unit_price ...` followed by recomputing `sales.total_amount` from its items, and for expenses re-deriving `cost` from the raw product price. This changes recorded amounts and must be explicitly approved.

Before running the migration against production, take a backup (`npm run backup:db`).

### 2.5 Domain schema diff — `docs/specs/phase-1-domain.json`
Three edits, all the same shape:

```diff
   "Expense": {
     ...
-    "quantity": { "type": "number", "exclusiveMinimum": 0 },
+    "quantity": { "type": "integer", "minimum": 1 },
```

```diff
   "SaleItemCreate": {
     ...
-    "quantity": { "type": "number", "exclusiveMinimum": 0 },
+    "quantity": { "type": "integer", "minimum": 1 },
```

```diff
   "SaleItem": {
     ...
-    "quantity": { "type": "number", "exclusiveMinimum": 0 },
+    "quantity": { "type": "integer", "minimum": 1 },
```

(`"type": "integer"` with `"minimum": 1` is used rather than `exclusiveMinimum: 0` because for integers they are equivalent and `minimum: 1` produces a clearer AJV message.)

### 2.6 Matching runtime validator diff — `lib/validators.js`
Required, because these schemas are declared inline and are what the API actually enforces:

```diff
 const ExpenseDef = {
-    quantity: { type: 'number', exclusiveMinimum: 0 },
+    quantity: { type: 'integer', minimum: 1 },
```

```diff
 const CreateSaleItemSchema = {
-    quantity: { type: 'number', exclusiveMinimum: 0 },
+    quantity: { type: 'integer', minimum: 1 },
```

AJV is configured with `coerceTypes: false`, so clients must send a real JSON integer (`3`, not `"3"` or `3.0`... note `3.0` is accepted by AJV as an integer, which is fine).

### 2.7 Backend validation changes
Replace `> 0` checks with whole-number checks, using the message **"quantity must be a positive whole number"** everywhere:
- `app/api/expenses/route.js` (POST fallback) — `if (!Number.isInteger(quantity) || quantity < 1) return errors.badRequest(...)`.
- `app/api/expenses/[id]/route.js` (PUT fallback) — same.
- `lib/services/sales.js#normalizeSaleLines` — `if (!Number.isInteger(quantity) || quantity < 1) throw validationError(...)` (keep the existing `lines[i].quantity` field path).
- `lib/services/sales.js#updateSaleItem` — same check on the incoming quantity.
- `app/api/sales/[id]/items/[itemId]/route.js` — the inline `qty` check becomes an integer check.

`toFiniteNumber` stays in use for parsing; the integer assertion is applied on top of it (do not silently `trunc` — reject instead, so the user sees the problem).

Example rejection response (unchanged envelope):
```json
// 400 POST /api/expenses  { "quantity": 1.5, ... }
{ "errors": [{ "message": "quantity must be a positive whole number" }] }
```

### 2.8 Frontend changes
- `components/ExpenseForm.jsx`: quantity input gets `step="1"` `min="1"` `inputMode="numeric"`; `validate()` checks `Number.isInteger(Number(data.quantity))` and sets the error `"Must be a whole number greater than 0"`; the submit payload uses `parseInt(data.quantity, 10)`. The auto-computed `cost` (raw product price × quantity) keeps working unchanged.
- `components/OrderBuilder.jsx`: the "Add Product" quantity input gets `step="1"` `inputMode="numeric"`; the per-line editor input changes from `step="0.01" min="0"` to `step="1" min="1"`; `addLineFromForm()` and `submit()` validate whole numbers and send `parseInt(...)`, with the message `Line N: quantity must be a whole number greater than 0`.
- `app/sales/[id]/page.js`: the two `editQty` inputs (mobile + desktop) get `step="1" min="1"`, and `saveLineEdit()` validates `Number.isInteger` before the PATCH.

### 2.9 Acceptance
- [ ] Migration runs cleanly on an empty/whole-number DB and is safely re-runnable.
- [ ] Migration aborts with a clear count message when fractional rows exist.
- [ ] `psql \d expenses` and `\d sale_items` show `quantity | integer` with the `> 0` check intact.
- [ ] `POST /api/expenses` with `quantity: 1.5` returns 400; with `quantity: 2` returns 201.
- [ ] `POST /api/sales` with a fractional line quantity returns 400 naming `lines[0].quantity`.
- [ ] `PATCH /api/sales/:id/items/:itemId` with a fractional quantity returns 400.
- [ ] Expense and order-line quantity inputs step by 1 and show a client-side message before submitting.

---

## 3. Expense date UTC off-by-one fix

### 3.1 Root cause (verified in `components/ExpenseForm.jsx`)
- **On submit** (line ~51): a date-only value is turned into `"YYYY-MM-DDT00:00:00Z"` — i.e. UTC midnight of the picked calendar day.
- **On load for edit** (line ~12): `new Date(initialData.purchased_at).toISOString().slice(0, 10)` — UTC-based, so it happens to round-trip correctly.
- **On display in the list** (`app/expenses/page.js` line 43): `new Date(it.purchased_at).toLocaleDateString()` — **local-timezone based**. For a Costa Rica user (UTC−6), `2026-08-29T00:00:00Z` renders as `8/28/2026`.

So the storage side is already consistent; the bug is that display uses local-time conversion on a value that means "a calendar day". Mixing the two conventions is what produces "one day ahead when creating, then one day behind".

### 3.2 Decision: fix in the app layer, keep `timestamptz`
`expenses.purchased_at` stays `timestamptz NOT NULL`. Justification:
- The repo convention is not to rewrite committed migrations, and an `ALTER ... TYPE date` would cast existing rows using the **server's** `TimeZone` setting (Neon vs. local can differ), which is exactly the class of bug being fixed — it could shift historical rows by a day during the conversion.
- Every value written by the app is already UTC midnight, so the data is already a faithful calendar date; only the read path is wrong.
- A future normalization to a real `date` column can be its own phase if desired; it is explicitly deferred here.

**Canonical convention (domain rule):** `purchased_at` represents a *calendar date*. It is always stored as `YYYY-MM-DDT00:00:00.000Z` and is always formatted/parsed **in UTC**, never through local-timezone conversion.

By contrast, `created_at` / `updated_at` on every entity are true instants and must keep using local formatting (`toLocaleString()` on sale detail, etc.). Do not route those through the calendar-date helper.

### 3.3 Backend
No API contract change. `purchased_at` keeps `format: date-time` in the schemas and keeps being returned as an ISO string.

Optional hardening (recommended, low risk): in `app/api/expenses/route.js` and `app/api/expenses/[id]/route.js`, normalize an incoming date-only string `YYYY-MM-DD` to `YYYY-MM-DDT00:00:00.000Z` server-side, so the invariant holds even if a client forgets. Reject values that are neither a valid ISO date-time nor a date-only string with the message `"purchased_at must be a valid date"`.

### 3.4 Frontend — shared helper
Add `lib/date.js` (client-safe, no dependencies) with:
- `toCalendarDateInput(value)` → `"YYYY-MM-DD"` for `<input type="date">`, derived from the ISO string's date part / UTC getters. Accepts `Date`, ISO string, or `"YYYY-MM-DD"`; returns `""` for null/invalid.
- `toCalendarDateISO(inputValue)` → `"YYYY-MM-DDT00:00:00.000Z"` for the request payload.
- `formatCalendarDate(value)` → user-facing display string built from the UTC date parts (not `new Date(...).toLocaleDateString()` on the raw instant).

Use it in:
- `components/ExpenseForm.jsx` — replace both the `initialData.purchased_at` parse block and the inline submit normalization.
- `app/expenses/page.js` — replace `new Date(it.purchased_at).toLocaleDateString()` in `purchased_at_display`.
- Any other place that renders `purchased_at` (currently none besides these two; the implementer should grep `purchased_at` before finishing).

### 3.5 Acceptance
- [ ] Creating an expense dated 2026-08-29 shows `2026-08-29` (or the localized equivalent of that day) in the list immediately after saving.
- [ ] Reopening that expense for edit shows `2026-08-29` in the date picker.
- [ ] Saving the edit without touching the date leaves the stored value unchanged (no drift across repeated save cycles).
- [ ] Behavior is identical with the browser TZ set to `America/Costa_Rica`, `UTC`, and `Asia/Tokyo` (a positive-offset zone, which is where the "one day ahead" symptom comes from).
- [ ] `created_at` timestamps on sales/detail views still render in local time.

---

## 4. Refetch after delete + pagination edge case

### 4.1 Already satisfied (verified — do not re-spec)
`components/EntityTable.jsx#doDelete()` calls `await onDeleteSuccess(id)` when the prop is provided, and all four pages that expose delete wire it to their fetcher:
- `app/products/page.js` → `onDeleteSuccess={fetchPage}`
- `app/raw-products/page.js` → `onDeleteSuccess={fetchPage}`
- `app/expenses/page.js` → `onDeleteSuccess={fetchItems}`
- `app/customers/page.js` → `onDeleteSuccess={fetchPage}`

So "refetch after delete" works today. The only real defect is the pagination interaction below. (`/sales` passes no `onDeleteSuccess` because it has no delete at all today — that is covered by section 5.)

### 4.2 Defect to fix
Deleting the last row of a non-first page leaves `offset` pointing past the new end of the collection. The refetch succeeds but returns an empty `items` array, so the user sees "No items found." on page 3 while pages 1–2 still have data.

### 4.3 Rule
After a successful delete, compute the effective offset against the new total:

```
newTotal  = total - 1
newOffset = (offset > 0 && offset >= newTotal) ? Math.max(0, offset - limit) : offset
```

- If `newOffset !== offset`: set the offset (which re-triggers the existing `useCallback`/`useEffect` fetch) and do **not** call the fetcher directly — avoid a double request.
- If `newOffset === offset`: call the fetcher as today.

### 4.4 Implementation
Add a pure helper `offsetAfterDelete({ offset, limit, total })` to a small client module (`lib/pagination-client.js`) so all five list pages share one definition rather than copy-pasting the arithmetic. Each page replaces `onDeleteSuccess={fetchPage}` with a small handler that applies the rule.

Also in `components/EntityTable.jsx#doDelete()`: when the response is not ok, parse the JSON body and surface `body.error || body.message` instead of the current generic `Delete failed: <status>` — needed so the sale-delete guard message from section 5 reaches the user.

### 4.5 Acceptance
- [ ] With 26 items at `limit=25`, deleting the single item on page 2 lands the user on page 1 with 25 items shown and `Showing 1 to 25 of 25`.
- [ ] Deleting a non-last item on page 2 keeps the user on page 2.
- [ ] Exactly one list request is issued per delete.
- [ ] Deleting on page 1 behaves exactly as it does today.
- [ ] A rejected delete shows the server's message, not just a status code.

---

## 5. Delete a sale (only while `ordered`)

**⚠️ Superseded post-implementation — see the [Addendum](#addendum-post-implementation-changes) at the end of this document.** The status restriction described below (§5.1–§5.5) was relaxed to allow deleting a sale in *any* status, and the detail-page "Delete Sale" button described in §5.4 was removed (delete now lives only on the list page). Kept here as the historical record of what was originally approved and built.

### 5.1 Domain rule
A sale may be **hard deleted only while its status is `ordered`**. This exists to remove mistaken or duplicate entries that were never acted on. For any other status the correct mechanism is the existing lifecycle:
- `prepared` / `delivered` → cancel (`POST /api/sales/:id/cancel`, unchanged).
- `paid` → neither cancellable nor deletable.
- `cancelled` → already terminal; keep the record.

`cancelSale` in `lib/services/sales.js` is **not** modified by this phase; it keeps rejecting `ordered` and `paid`. Delete is a separate, narrower mechanism that covers the `ordered` gap.

Deleting a sale permanently removes its line items. This is intentional (the sale never entered the operational flow) and there is no soft-delete/audit requirement in this phase.

### 5.2 Cascade (verified)
`migrations/20260323_create_phase1_tables.sql` declares
`CONSTRAINT fk_saleitem_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE`,
so deleting the `sales` row removes its `sale_items` rows automatically. **No new migration and no manual child delete are needed.** The service must not delete items separately.

### 5.3 Backend

**Query** — add to `lib/db/queries/sales.js`:
```js
export async function deleteSaleById(id, db) // DELETE FROM sales WHERE id = $1 RETURNING id
```

**Service** — add to `lib/services/sales.js`:
```js
export async function deleteSale(id)
```
inside `runTransaction`:
1. `getSaleStatusRow(id, client, { forUpdate: true })` → if null, `throw { status: 404, message: 'sale not found' }`.
2. If `status !== 'ordered'` → `throw { status: 409, message: \`cannot delete a ${status} sale; only sales in 'ordered' status can be deleted\` }`.
3. `deleteSaleById(id, client)`; return `{ success: true }`.

**Route** — add `DELETE` to the existing `app/api/sales/[id]/route.js`:
- Validate the id with the same `isUuid` guard used in `app/api/expenses/[id]/route.js` and return 400 `{"errors":[{"message":"Invalid id format"}]}` on failure. (Today the sales routes have no uuid guard, so a malformed id surfaces a raw Postgres `22P02` error — worth closing while we are here.)
- Success: `204` with no body (`errors.json({}, 204)`, matching the expenses delete convention).
- `404` → `errors.notFound(err.message)`.
- `409` → `errors.conflict(err.message)`.

Contract examples:
```
DELETE /api/sales/6f1c...  (status = ordered)
→ 204 No Content

DELETE /api/sales/6f1c...  (status = delivered)
→ 409 { "error": "cannot delete a delivered sale; only sales in 'ordered' status can be deleted" }

DELETE /api/sales/6f1c...  (unknown id)
→ 404 { "error": "sale not found" }
```

### 5.4 Frontend

The sales list already renders through the shared `EntityTable` (via the local `SalesTable` wrapper in `app/sales/page.js`) but passes only `viewHrefBase`, and `EntityTable` currently gates the Delete affordance on `editHrefBase` — so sales get no delete button today. Rather than giving sales a bespoke table, extend `EntityTable` with two optional props:

- `deleteHrefBase` — API/route base used for delete when there is no `editHrefBase`.
- `canDelete(item)` — optional predicate; when provided, the Delete affordance renders only for items where it returns true.

Delete renders when `(editHrefBase || deleteHrefBase)` **and** (`canDelete` is absent or returns true). This keeps all four existing pages byte-for-byte identical in behavior.

Then:
- `app/sales/page.js` passes `deleteHrefBase="/sales"`, `canDelete={(it) => it.status === 'ordered'}`, and an `onDeleteSuccess` handler that applies the section 4.3 offset rule and refetches. The confirm copy comes from the existing `ConfirmDialog` (`entityName="Sale"`).
- `app/sales/[id]/page.js` gains a "Delete Sale" button in the existing action row, rendered only when `sale.status === 'ordered'`, styled like the existing destructive `Cancel Sale` button, guarded by `ConfirmDialog` ("Deleting this sale also removes its order items. This cannot be undone."), and on success `router.push('/sales')`. On 409/404 it shows the server message in the existing error area.

Both surfaces are included so the user can clean up either from the list or from the record they just opened.

### 5.5 Acceptance
- [ ] `DELETE /api/sales/:id` returns 204 and removes the sale **and** its `sale_items` when the status is `ordered`.
- [ ] It returns 409 with a readable message for `prepared`, `delivered`, `paid`, and `cancelled`.
- [ ] It returns 404 for an unknown id and 400 for a malformed id.
- [ ] `cancelSale` behavior is unchanged (still rejects `ordered` and `paid`).
- [ ] The list row shows a Delete action only for `ordered` sales; the detail page shows "Delete Sale" only for `ordered` sales.
- [ ] Deleting from the list refreshes correctly, including the last-item-on-page case.

---

## 6. Sorting for all list tables (date + name)

### 6.1 API contract
Two new optional query params on every list endpoint, alongside the existing `limit` / `offset` from Phase 6:

| Param  | Type   | Values                        | Notes |
|--------|--------|-------------------------------|-------|
| `sort` | string | per-entity whitelist (below)  | invalid → 400 |
| `order`| string | `asc` \| `desc` (case-insensitive) | invalid → 400 |

Rules:
- The whitelist is enforced server-side; the raw param is **never** interpolated into SQL. The query module maps an allowed key to a fixed SQL expression.
- If `sort` is omitted, the entity default applies. If `sort` is given without `order`, the column's default direction applies.
- Every ORDER BY appends a deterministic tiebreaker (`, <table>.id ASC`) so pagination cannot duplicate or skip rows when the sort key has ties.
- Text sorts use `LOWER(col)` (matching the existing `lower(name)` functional indexes) and `NULLS LAST`.
- Response shape is unchanged (`{ items, total, limit, offset }`). Echoing `sort`/`order` back is optional and not required by the frontend.

Error example:
```
GET /api/products?sort=price
→ 400 { "errors": [{ "field": "sort", "message": "sort must be one of: name, created_at" }] }
```

### 6.2 Per-entity whitelists (scoped to what each list actually shows)

| Endpoint | Allowed `sort` | SQL expression | Default |
|---|---|---|---|
| `GET /api/raw-products` | `name`, `created_at` | `lower(name)`, `created_at` | `created_at desc` |
| `GET /api/products` | `name`, `created_at` | `lower(name)`, `created_at` | `created_at desc` |
| `GET /api/customers` | `name`, `created_at` | `lower(name)`, `created_at` | `created_at desc` |
| `GET /api/expenses` | `purchased_at`, `raw_product_name` | `e.purchased_at`, `lower(rp.name) NULLS LAST` | `purchased_at desc` |
| `GET /api/sales` | `created_at`, `customer_name` | `s.created_at`, `lower(c.name) NULLS LAST` | `created_at desc` |

Column default directions: date-like keys default to `desc`, name-like keys default to `asc`.

Notes and interpretations:
- Expenses has no "Name" column of its own; its list shows the joined raw product. `raw_product_name` is offered as the "Name" sort because the join already exists in `listExpenses`. **If the human prefers to keep expenses date-only, drop this key** — nothing else depends on it.
- Sales has no "Name" column either; "Name" maps to the customer, which is the closest equivalent and is already joined in `SALE_HEADER_SELECT`.
- Status, price, total, and supplier are deliberately **not** sortable in this phase.
- All defaults match today's behavior exactly, so an un-sorted request is a no-op change.

### 6.3 Backend implementation
- New shared helper `lib/sorting.js`, mirroring `lib/pagination.js`:
  `parseSortParams(url, { allowed: ['name', 'created_at'], defaultSort: 'created_at', defaultOrder: 'desc', columnDefaults: { name: 'asc' } })` → `{ sort, order, errors }`.
- Each route calls it right after `parsePaginationParams`, returns `errors.badRequest(sortErrors)` on failure, and passes `{ limit, offset, sort, order }` into the list query.
- Each query module (`rawProducts.js`, `products.js`, `customers.js`, `expenses.js`, `sales.js`) owns a frozen `SORTABLE` map from key → SQL expression and builds the `ORDER BY` from it. SQL text stays in the query layer per Phase 7. Unknown keys fall back to the default rather than throwing (defense in depth; the route already rejected them).
- `countSales` / `countExpenses` etc. are unaffected — sorting never changes the total.

### 6.4 Frontend
`components/EntityTable.jsx` is the single shared table for all five lists (sales included, through its `SalesTable` wrapper), so all sorting UI lands there:
- New props: `sort`, `order`, `onSortChange(key)`.
- Columns opt in with `sortKey` (and optional `defaultOrder`). Columns without `sortKey` render as today.
- Desktop `<th>` for a sortable column becomes a button: clicking the active key toggles asc/desc; clicking a new key selects it with its `defaultOrder`. Show a ▲/▼ indicator on the active column only, set `aria-sort` on the header, and keep the sticky-header/scroll-body pattern from Phase 6 intact.
- Mobile (`lg:hidden` card view) has no headers, so `EntityTable` renders a compact "Sort by" `<select>` above the cards whenever sortable columns exist (options = sortable columns × direction, or a select plus a direction toggle button — implementer's choice, must be reachable with a 44px touch target per the responsive skill).
- Each page holds `sort`/`order` in state, includes them in its fetch query string, and **resets `offset` to 0 on every sort change**. Sort state is component state only — no URL persistence in this phase.
- Column wiring: `name`/`created_at` on products, raw products, customers; `purchased_at` (+ optional `raw_product_name`) on expenses; `created_at`/`customer_name` on sales. Note the expenses page currently displays a derived `purchased_at_display` / `raw_product_display` column — the `sortKey` must be the **server** key (`purchased_at`, `raw_product_name`), not the display key.

### 6.5 Acceptance
- [ ] All five list endpoints accept `sort` and `order` and reject unknown values with 400.
- [ ] Omitting both params returns exactly today's ordering for all five endpoints.
- [ ] Sorting is applied by the database across the whole collection, not just the current page (verify by sorting by name ascending with >25 rows and checking page 2 continues the sequence).
- [ ] Results are stable across pages when many rows share a sort value (tiebreaker present).
- [ ] Clicking a sortable header toggles direction and shows a single active indicator; `aria-sort` is set.
- [ ] Changing the sort resets to page 1.
- [ ] Mobile card view exposes an equivalent sort control.
- [ ] Non-sortable headers (Price, Status, Total, Supplier, Notes) are not clickable.

---

## 7. New reports section

Extends the existing `/reports` page and adds new endpoints under `/api/reports/*`. `GET /api/reports/summary` and `getDashboardStats` are **not** modified.

### 7.1 Status-scoping decision (explicit domain decision)
All three new reports count **only sales with `status = 'paid'`.**

Reasoning:
- `lib/db/queries/metrics.js#getDashboardStats` already computes `total_sales_amount` as `SUM(total_amount) WHERE status = 'paid'`, and Phase 7 explicitly froze that as the canonical shared definition of recognized sales.
- The new "sales per month (money)" chart must reconcile with the "Total Sales" card already on the same page. Using a different scope would make the page contradict itself.
- Applying one scope to all three (money and volume) keeps "top products" and "top customers" answerable with the same sentence: *what has actually been sold and paid for*.

To keep the rule visible rather than silent:
- Every new response includes `"status_scope": "paid"`.
- Each new `/reports` section carries a small caption: "Based on paid sales."
- A future `?scope=` param (e.g. `paid` vs. all non-cancelled, for pipeline visibility) is noted as a possible follow-up phase and is **out of scope here**.

Additional scoping rules: `sale_items` rows with a NULL `prepared_product_id` (custom lines are permitted by the schema) are excluded from the top-products report and noted in the plan; they are still counted for top customers and monthly money, since those aggregate the sale, not the catalog product.

### 7.2 New endpoints

All three live in a new `lib/db/queries/reports.js` module (Phase 7 anticipated exactly this file), with thin route handlers under `app/api/reports/`.

#### `GET /api/reports/top-products?limit=3`
`limit`: optional integer, default `3`, allowed `1..20`; invalid → 400.

```json
{
  "items": [
    { "prepared_product_id": "…uuid…", "product_name": "Mixed Nuts", "unit": "250g", "total_quantity": 48, "total_amount": 96000 }
  ],
  "limit": 3,
  "status_scope": "paid",
  "generated_at": "2026-08-29T15:04:05.000Z"
}
```
Aggregate: `SUM(si.quantity)` and `SUM(si.line_total)` from `sale_items si JOIN sales s ON si.sale_id = s.id JOIN prepared_products pp ON si.prepared_product_id = pp.id WHERE s.status = 'paid'`, grouped by `pp.id, pp.name, pp.unit`, ordered by `total_quantity DESC, lower(pp.name) ASC`, limited. Empty dataset → `items: []`, never an error.

#### `GET /api/reports/top-customers?limit=5`
`limit`: optional integer, default `5`, allowed `1..20`.

```json
{
  "items": [
    { "customer_id": "…uuid…", "customer_name": "María R.", "total_quantity": 32, "order_count": 7, "total_amount": 128000 }
  ],
  "limit": 5,
  "status_scope": "paid",
  "generated_at": "2026-08-29T15:04:05.000Z"
}
```
**Interpretation of "who is purchasing more products":** ranked by `total_quantity` = `SUM(si.quantity)` (total units bought), with `order_count = COUNT(DISTINCT s.id)` and `total_amount = SUM(si.line_total)` included as context columns. The alternative reading (count of *distinct* products) is deliberately not used; if the human prefers it, it is a one-line change to `COUNT(DISTINCT si.prepared_product_id)`. Aggregate over `sale_items → sales → customers WHERE s.status = 'paid' AND s.customer_id IS NOT NULL`, ordered by `total_quantity DESC, lower(c.name) ASC`.

#### `GET /api/reports/sales-monthly?months=12`
`months`: optional integer, default `12`, allowed `1..36`.

```json
{
  "items": [
    { "month": "2026-07", "month_start": "2026-07-01", "total_amount": 240000, "sales_count": 12 },
    { "month": "2026-08", "month_start": "2026-08-01", "total_amount": 0,      "sales_count": 0 }
  ],
  "months": 12,
  "status_scope": "paid",
  "generated_at": "2026-08-29T15:04:05.000Z"
}
```
Rules:
- Trailing `months` buckets ending with the current month, ordered **ascending** by month (chart-friendly).
- Months with no paid sales are **zero-filled** via `generate_series`, so the chart has a continuous axis.
- Bucketing is computed in **UTC** (`date_trunc('month', s.created_at AT TIME ZONE 'UTC')`) for determinism across local/Neon/Vercel environments, whose server `TimeZone` settings differ. The business operates in `America/Costa_Rica` (UTC−6), so a sale recorded late on the last day of a month may fall into the next bucket. This is accepted for now; switching to `AT TIME ZONE 'America/Costa_Rica'` is a one-line change and is flagged as a decision the human can make at approval time.
- Money values go through the existing `normalizeMoney` policy, consistent with Phase 7.

### 7.3 Supporting indexes — `migrations/20260829_report_and_sort_indexes.sql`

Already present in `migrations/20260323_create_phase1_tables.sql` / `20260324_add_customers_table.sql` (**do not recreate**): `idx_sale_items_sale_id`, `idx_sale_items_prepared_product_id`, `idx_sales_created_at`, `idx_sales_status`, `idx_sales_customer_id`, `idx_expenses_raw_product_id`, `idx_raw_products_name (lower)`, `idx_prepared_products_name (lower)`, `idx_customers_name`.

New:
```sql
-- Phase 12: indexes supporting the new report aggregates and list sorting.
BEGIN;

-- paid-only monthly aggregation + status-filtered sales list ordered by date
CREATE INDEX IF NOT EXISTS idx_sales_status_created_at
  ON sales(status, created_at DESC);

-- expenses default ordering / date sort (no index existed for this column)
CREATE INDEX IF NOT EXISTS idx_expenses_purchased_at
  ON expenses(purchased_at DESC);

-- case-insensitive name sorting for customers (existing index is not lower())
CREATE INDEX IF NOT EXISTS idx_customers_name_lower
  ON customers(lower(name));

-- default created_at DESC ordering for the remaining list endpoints
CREATE INDEX IF NOT EXISTS idx_raw_products_created_at
  ON raw_products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prepared_products_created_at
  ON prepared_products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_created_at
  ON customers(created_at DESC);

COMMIT;
```
All statements use `IF NOT EXISTS` and are safe to re-run.

### 7.4 Charting dependency (explicit decision point)
`package.json` dependencies today: `ajv`, `ajv-formats`, `next`, `pg`, `react`, `react-dom`, `sharp`. **There is no charting library.**

Decision: **do not add one.** The monthly chart is a small in-repo component (`components/MonthlySalesChart.jsx`) rendering plain Tailwind-styled bars (or an inline `<svg>`) from the endpoint's array — 12 bars with month labels and a value tooltip/label. Rationale: a single bar chart does not justify a new runtime dependency and bundle cost, and the data endpoint is the part that matters and is fully specified above.

If the human wants a richer chart (Recharts, Chart.js, etc.), that is a separate approved decision; the endpoint contract does not change either way.

### 7.5 Frontend — `/reports`
Keep the existing Financial Summary block at the top, then add three sections below it, in this order:
1. **Top Products** — ranked list/table: rank, product name (+ unit size), units sold, amount. Caption "Based on paid sales."
2. **Top Customers** — ranked list/table: rank, customer name, units purchased, orders, amount. Caption "Based on paid sales."
3. **Sales per Month** — `MonthlySalesChart` plus a screen-reader-accessible table (or `<figcaption>` + list) of the same numbers. Caption "Paid sales, last 12 months (UTC months)."

Requirements:
- Each section fetches its own endpoint with its own loading/error state, so one failing report does not blank the page.
- Empty data renders a friendly empty state ("No paid sales yet"), never a crash — matching the Phase 6 acceptance rule.
- Money renders through the existing `<Amount />` component.
- Responsive per `.claude/skills/responsive-tailwind-design/SKILL.md`: cards stack on mobile, table/grid on `lg`; the chart scrolls horizontally or reduces the visible month count on small screens rather than squashing labels.
- Reuse existing theme tokens (`text-primary`, `bg-primary/5`, the amber/green/red accents already on the page); no new brand colors. If a new accent is genuinely needed, derive it from `public/logo.png` and record it in `tailwind.config`/theme rather than hardcoding it inline.
- No dashboard changes; `/reports` is already linked from the dashboard Reports card (Phase 6).

### 7.6 Acceptance
- [ ] `GET /api/reports/top-products` returns at most `limit` items ordered by units sold desc, counting only `paid` sales, excluding NULL-product custom lines.
- [ ] `GET /api/reports/top-customers` returns at most `limit` items ordered by units purchased desc, counting only `paid` sales.
- [ ] `GET /api/reports/sales-monthly` returns exactly `months` ascending buckets, zero-filled, counting only `paid` sales.
- [ ] All three include `status_scope: "paid"` and `generated_at`, and return empty/zero data (not an error) on an empty database.
- [ ] Invalid `limit`/`months` values return 400 with a field-named message.
- [ ] The monthly total for a given month equals the sum of that month's paid sales, and the sum over all months reconciles with the Financial Summary "Total Sales" card when the range covers all history.
- [ ] `/reports` renders all four sections with independent loading/error states and readable mobile layout.
- [ ] No new npm dependency was added.
- [ ] The new index migration applies cleanly and is re-runnable.

---

## Deliverables Summary

**New migrations**
- `migrations/20260829_integer_quantities.sql` (section 2.3)
- `migrations/20260829_report_and_sort_indexes.sql` (section 7.3)

**Spec/domain updates (architect-owned, applied as part of this phase)**
- `docs/specs/phase-1-domain.json` — `Expense.quantity`, `SaleItemCreate.quantity`, `SaleItem.quantity` → `{ "type": "integer", "minimum": 1 }` (exact diffs in 2.5)
- `lib/validators.js` — matching change to the inline `ExpenseDef` and `CreateSaleItemSchema` (exact diffs in 2.6); this is implementation work for `backend`, but the values come from the domain schema above and must not diverge from it

**New backend modules**
- `lib/sorting.js` (shared sort param parsing)
- `lib/db/queries/reports.js` (three aggregates)
- `app/api/reports/top-products/route.js`, `app/api/reports/top-customers/route.js`, `app/api/reports/sales-monthly/route.js`
- `deleteSaleById` in `lib/db/queries/sales.js`, `deleteSale` in `lib/services/sales.js`, `DELETE` in `app/api/sales/[id]/route.js`

**New frontend modules**
- `lib/date.js` (calendar-date helpers)
- `lib/pagination-client.js` (`offsetAfterDelete`)
- `components/MonthlySalesChart.jsx`

**Modified**
- Backend: `app/api/{raw-products,products,customers,expenses,sales}/route.js`, `app/api/expenses/route.js` + `app/api/expenses/[id]/route.js`, `app/api/sales/[id]/items/[itemId]/route.js`, `lib/services/sales.js`, `lib/db/queries/{rawProducts,products,customers,expenses,sales}.js`
- Frontend: `components/{EntityTable,ExpenseForm,OrderBuilder,RawProductForm,ProductForm}.jsx`, `app/{products,raw-products,expenses,customers,sales}/page.js`, `app/sales/[id]/page.js`, `app/reports/page.js`

## User Flows
1. User opens `/raw-products`, sees the "Unit Size" column, clicks the "Name" header, and the whole catalog re-sorts alphabetically starting from page 1.
2. User records an expense of 3 units purchased on Aug 29; the list shows Aug 29, and reopening the record still shows Aug 29.
3. User tries to enter a quantity of 2.5 and is stopped with "Must be a whole number greater than 0" before any request is sent.
4. User creates a sale by mistake, opens it while it is still `ordered`, clicks "Delete Sale", confirms, and returns to a refreshed `/sales` list.
5. User deletes the only expense on page 3; the app moves them to page 2 with data visible instead of an empty table.
6. User opens `/reports` and sees the existing financial summary plus the top 3 products, top 5 customers, and a 12-month sales bar chart, all labelled "Based on paid sales".

## Dependencies / Notes
- Builds on Phases 2–7 (products, expenses, sales, customers, reporting/pagination, DB access refactor) and Phase 11 (deployment). No new entity is introduced.
- **Migration runner gap:** `package.json` defines `test:backend` as `node tests/test_migrations_and_sales.js`, but there is **no `tests/` directory in the repo** — that script currently cannot run, even though Phase 11 documents it as the way migrations get applied. Before implementing, `backend` must confirm with the human how migrations are applied now (manual `psql -f`, or restoring the runner). Verification for this phase should otherwise rely on `npm run lint`, `npm run build`, and manual API checks against a live `DATABASE_URL`.
- Take a database backup (`npm run backup:db`) before running the integer-quantity migration against production.
- `backend` and `frontend` can work in parallel from this document: the API contracts in sections 5.3, 6.1–6.2 and 7.2 are concrete enough for the UI to be built before the endpoints exist.
- `frontend` must load `.claude/skills/responsive-tailwind-design/SKILL.md` before touching `EntityTable`, the reports page, or the chart.
- Out-of-scope observation, recorded so it is not mistaken for part of this phase: `app/expenses/page.js` sends a `raw_product_id` query param that `GET /api/expenses` ignores, so the "Raw Product" filter on that page does nothing. Worth a future phase.
- The scratch file `docs/plans/new-improvements-1.md` holds the human's original bullet list and is superseded by this document; it can be deleted at the human's discretion (it is not touched by this plan).

---

## Addendum: post-implementation changes

Two small changes made directly by the human during manual testing (after phases 12–14 were implemented and reviewed), recorded here so this document stays an accurate reference. Both were applied ad hoc (not through a full architect plan cycle) given their size, and confirmed via `npm run lint` / `npm run build` after each.

### A.1 Delete-sale: opened up to any status

**What changed:** §5's `status !== 'ordered'` gate in `deleteSale` (`lib/services/sales.js`) was removed. A sale can now be hard-deleted from **any** status — `ordered`, `prepared`, `delivered`, `paid`, or `cancelled` — not just `ordered`.

**Why:** the human found the `ordered`-only restriction limiting during manual testing/cleanup of the phase 12–14 work and asked for it to be relaxed, explicitly requesting a warning modal before delete to guard against accidental use given the wider blast radius (a `paid` sale with recorded credits can now be deleted, permanently losing that financial history — `sale_credits` still cascade-deletes cleanly via the existing FK from §5.2, so no orphaned rows are left behind).

**What did NOT change:** `cancelSale` semantics (§5.1) are still untouched — cancel remains the correct mechanism to preserve a record while marking it void; delete is still a separate, permanent mechanism. The `sale_items`/`sale_credits` cascade behavior from §5.2 is unchanged and still holds.

**Frontend split — delete now lives only on the list page:**
- `app/sales/page.js` — the `canDelete={(it) => it.status === 'ordered'}` predicate described in §5.4 was removed entirely from the `EntityTable` call, so the row-level Delete action (with its own `ConfirmDialog` warning) is available for every sale regardless of status.
- `app/sales/[id]/page.js` — the "Delete Sale" button, its `ConfirmDialog`, and the `confirmDelete`/`doDeleteSale` state and handler described in §5.4 were **removed** from the detail page at the human's explicit request ("I just need it in the list page"). Deleting a sale is now a list-only action.

**Superseded acceptance criteria (§5.5):** the 409-for-non-ordered checks no longer apply — `DELETE /api/sales/:id` now returns 204 for every status given a valid id. The 404-for-unknown-id and 400-for-malformed-id checks are unchanged.

### A.2 Reports: Top Products expanded from 3 to 5

**What changed:** `app/reports/page.js`'s `TopProductsSection` now fetches `/api/reports/top-products?limit=5` instead of `?limit=3` (§7's user flow #6 and the `GET /api/reports/top-products?limit=3` contract example are stale on this one detail).

**Why:** human preference, requested directly during manual testing.

**What did NOT change:** the endpoint itself (`app/api/reports/top-products/route.js`) still validates `limit` between 1 and 20 and defaults to 3 when the param is omitted (§7.2) — only this one frontend call site changed. `GET /api/reports/top-customers` (still 5, per the original flow) and the monthly chart are untouched.

---
Stop: do NOT implement or delegate yet. Wait for explicit human approval.
