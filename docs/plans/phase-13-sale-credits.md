# Phase 13: Sale Credits (Partial Payments)

## Overview

Most sales are paid in full in one shot: the user opens a `delivered` sale and clicks **Mark Paid**. For a small number of customers the total is instead settled in several partial payments over time — e.g. a ₡20,000 sale paid as ₡7,000, then ₡6,000, then ₡7,000.

This phase adds a **credit** (partial payment) record against a sale, a **derived balance** (`total_amount − sum of credits`), and a gate so a sale with credits can only be marked paid once its balance reaches exactly zero.

Nothing about the existing full-payment path changes. A sale with zero credits transitions `delivered → paid` exactly as it does today.

This builds on phases 1–12 and follows the Phase 7 architecture: routes stay thin, SQL lives in `lib/db/queries/*`, multi-step writes live in `lib/services/*` inside `runTransaction`.

## Objectives

1. Persist individual, dated partial payments against a sale (`sale_credits`).
2. Expose the derived payment state (`amount_paid`, `balance_due`, `credit_count`) on the sale detail response.
3. Allow recording a credit only while the sale is `delivered`, and never for more than the remaining balance.
4. Allow deleting a credit while the sale is not yet `paid` (corrections are delete-and-re-add, not in-place edit — human-confirmed decision, see §7).
5. Block `delivered → paid` while a credited sale still has a balance, without touching the behavior of un-credited sales.
6. Surface all of the above on `app/sales/[id]/page.js` next to the existing Total Amount card and action row.

## Scope

### Included
- One new migration creating the `sale_credits` table + indexes.
- A new `SaleCredit` / `SaleCreditCreate` entry in `docs/specs/phase-1-domain.json`, plus the matching inline request schema in `lib/validators.js`.
- Query functions for credits in `lib/db/queries/sales.js`.
- Service functions in `lib/services/sales.js`: `addSaleCredit`, `deleteSaleCredit`, plus a narrowly-scoped rule change inside `transitionSale`.
- Routes: `POST /api/sales/:id/credits`, `DELETE /api/sales/:id/credits/:creditId`.
- Extension of the sale detail payload (`GET /api/sales/:id` and every service call that returns a sale detail) with `credits`, `amount_paid`, `balance_due`, `credit_count`.
- Sale detail UI: payment summary, Record Credit form, credits history list, updated Mark Paid affordance.

### NOT Included
- **A customer-level account/ledger across sales.** Balance is strictly per-sale (human-confirmed decision 1). No "customer owes ₡X across 3 sales" view.
- **Refunds, over-payments, change, or reconciliation of a cancelled sale's collected money** (see §3.5).
- **Backdating a credit.** `recorded_at` is server-set to `now()` in this phase (see §4.1).
- **Auto-transitioning to `paid`** when the balance hits zero — Mark Paid stays an explicit user action (see §3.4).
- **Credits on the sales list** (`/sales`): no balance column, no filter for "partially paid". The detail page is the only surface.
- **Report changes.** No new report endpoint and no change to `getDashboardStats` or the phase-12 report endpoints (see §3.6).
- **Payment methods / references** (cash vs. transfer, receipt number). Free-text `notes` only.
- Fixing the general backward-transition hole in `transitionSale` beyond what §3.3 requires (recorded as an out-of-scope observation in §8).

---

## 1. Domain Model

### Entity: `SaleCredit`
A single partial payment received against one sale.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `sale_id` | uuid | FK → `sales.id`, `ON DELETE CASCADE` (same pattern as `sale_items`) |
| `amount` | numeric(12,2) | CRC, `> 0` |
| `notes` | text, nullable | free text, max 5000 chars (matches the `customers.notes` convention) |
| `recorded_at` | timestamptz | business date of the payment; server-set to `now()` in this phase |
| `created_at` | timestamptz | row audit, `DEFAULT now()` |
| `updated_at` | timestamptz, nullable | set on edit |

### Relationships
`Sale 1 ── * SaleCredit`. A credit belongs to exactly one sale and has no meaning outside it.

### Derived values (never stored)
For a sale `S`:
- `amount_paid = SUM(sale_credits.amount WHERE sale_id = S.id)`, `0` when there are none
- `balance_due = S.total_amount − amount_paid`
- `credit_count = COUNT(sale_credits WHERE sale_id = S.id)`

These are computed on read. There is deliberately **no** `sales.amount_paid` column: a stored mirror of a sum is a second source of truth that can drift from the rows it summarizes (human-confirmed decision 2). The credit rows are the ledger; the balance is a view of them.

### Business rules
- **R1 — Recording window.** A credit may be created only while `sales.status = 'delivered'`. That is the same status where Mark Paid already lives, and the first status at which the total is final. Any other status → 409.
- **R2 — No overpayment.** A credit is rejected if it would make `amount_paid > total_amount`. The check runs against the *current* derived balance, inside the write transaction (§3.1).
- **R3 — Mutability.** A credit may be deleted while the sale's status is **not** `paid`. Once the sale is `paid`, its credits are immutable — mirroring `assertSaleMutable`, which freezes a sale's line items once it leaves the editable statuses. There is no in-place edit; correcting a mistaken amount is delete-and-re-add (human-confirmed decision, §7).
- **R4 — Paid gate.** `delivered → paid` is rejected when `credit_count > 0` and `balance_due > 0`. When `credit_count = 0` the transition behaves exactly as it does today (full payment in one shot, no credit rows needed).
- **R5 — Money precision.** Amounts are CRC with at most 2 decimals. All balance comparisons are done in **integer cents** so float representation cannot make a ₡0.00 balance fail a `=== 0` test.

---

## 2. Explicit design decisions

These are the judgment calls this phase makes, stated inline rather than left implicit (following the phase-12 convention).

### 2.1 Overpayment is rejected, not absorbed
A credit whose amount exceeds the remaining balance is **rejected** with 409 and a message naming the remaining balance. Reasoning:
- `sales.total_amount` is the contractual amount and is derived from the line items. Accepting `amount_paid > total_amount` would create a negative balance with no entity to represent it (there is no refund/credit-note entity in this system), so it would be silently unrepresentable.
- The realistic cause of an over-limit credit is a typo (an extra zero), and the user is standing in front of the screen and can fix it immediately.
- Genuine over-collection (customer paid extra / tip / next-order deposit) belongs to a customer-account feature, which is explicitly out of scope (decision 1).

The check must be inside the same transaction as the insert, with the `sales` row locked (`FOR UPDATE`), so two credits submitted concurrently cannot both pass a stale balance check and jointly overshoot the total.

### 2.2 The rejection is 409, not 400
Amount shape problems (missing, non-numeric, `<= 0`, more than 2 decimals) are **400** `validation_error` — they are wrong regardless of server state. Overpayment and status violations depend entirely on the current state of the sale, so they are **409 Conflict**, matching how phase 12 modeled "you can't delete a `delivered` sale".

### 2.3 `total_amount` cannot change while credits exist — but one hole must be closed
Verified in the current source:
- `sales.total_amount` is written in exactly two places: `createSaleRecord` (at creation) and `recalculateSaleTotal` (called only from `updateSaleItem` and `deleteSaleItem` in `lib/services/sales.js`).
- Both item mutators call `assertSaleMutable(status, …)`, which throws for `delivered`, `paid`, and `cancelled`.
- There is **no** "add an item to an existing sale" route — `app/api/sales/[id]/items/` only exposes `[itemId]` PATCH/DELETE.

So while a sale sits at `delivered`, its total is frozen and credits are safe. **However, it is not already impossible.** `transitionSale` only guards the *target* status:

```
toStatus === 'delivered' → requires fromStatus === 'prepared'
toStatus === 'paid'      → requires fromStatus === 'delivered'
toStatus === 'cancelled' → requires prepared | delivered
toStatus === 'prepared'  → NO from-status check
```

The only blanket rule is `fromStatus === 'paid'` → 403. Therefore `POST /api/sales/:id/transition {"to_status":"prepared"}` on a **delivered** sale succeeds today. That would make the sale mutable again (`prepared` passes `assertSaleMutable`), letting a user change line items and thus `total_amount` **after** credits exist — potentially leaving `amount_paid > total_amount`.

**Decision: a new guard is required.** `transitionSale` gains one narrow rule — if the sale has any credits, it may not move to a status where credits are not permitted (`ordered` / `prepared`). Sales with zero credits keep today's behavior byte-for-byte; the general backward-transition looseness is *not* fixed here (§8).

### 2.4 Mark Paid stays manual; the gate only tightens
`POST /api/sales/:id/transition {"to_status":"paid"}` gains exactly one additional check (R4) and nothing else. Specifically:
- Zero credits → unchanged. This is the majority path the human described and it must not regress.
- Credits present, `balance_due > 0` → 409.
- Credits present, `balance_due = 0` → allowed.

The system does **not** auto-mark a sale paid when the final credit brings the balance to zero. The human explicitly framed this as "then mark it as paid once the current balance is 0" using the existing button, and keeping the state change a deliberate act preserves one clear place where revenue is recognized. (Auto-transition would also make an accidental final credit instantly irreversible, since `paid` is terminal.)

### 2.5 Cancelling a sale that has credits stays allowed, unchanged
`cancelSale` is **not** modified. A `delivered` sale with partial credits can still be cancelled.

Reasoning: cancellation is a *status* change, not a financial reconciliation. This system has no refund, credit-note, or cash-movement entity, so there is nothing meaningful for `cancelSale` to do with money already collected beyond keeping the record of it. The credit rows are therefore **preserved** on the cancelled sale (they document that money was received) and remain deletable, since the sale is not `paid` (R3).

Explicit boundary: **this phase provides no refund or reconciliation flow.** A known consequence is that money collected on a sale that is later cancelled is invisible to every report, because all report aggregates are scoped to `status = 'paid'`. That is accepted for now and is a candidate for a future "cash received / outstanding balances" phase (§8).

### 2.6 Reports are unchanged: partial payments are not recognized until the sale is paid
`getDashboardStats` computes `total_sales_amount` as `SUM(total_amount) WHERE status = 'paid'`, and the three phase-12 report endpoints are all scoped to `status = 'paid'` (phase 12 §7.1 froze that as the canonical definition of recognized sales).

A `delivered` sale with ₡13,000 of ₡20,000 collected therefore contributes **nothing** to any report until it flips to `paid`, at which point the whole ₡20,000 lands at once.

**This is intended and accepted for this phase**, stated here so it is not ambiguous: reports answer "what has been sold and fully paid for", not "how much cash has come in". Changing that would require picking a second, competing definition of recognized revenue and would put `/reports` in disagreement with its own Financial Summary card.

Out of scope, noted as a candidate future phase: an "Outstanding balances" report listing `delivered` sales with `balance_due > 0` plus a "collected so far" figure. Do not design or build it now.

---

## 3. Backend Design

### 3.1 Migration — `migrations/20260830_create_sale_credits.sql`

```sql
-- Phase 13: partial payments (credits) recorded against a sale.
BEGIN;

CREATE TABLE IF NOT EXISTS sale_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  notes text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  CONSTRAINT fk_sale_credit_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
);

-- every read is "all credits for one sale", ordered by payment date
CREATE INDEX IF NOT EXISTS idx_sale_credits_sale_id ON sale_credits(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_credits_sale_id_recorded_at
  ON sale_credits(sale_id, recorded_at);

COMMIT;
```

Notes for the implementer:
- Idempotent / safe to re-run (`IF NOT EXISTS` throughout), per the Phase 11 requirement.
- `ON DELETE CASCADE` matches `fk_saleitem_sale`. It also means the phase-12 `DELETE /api/sales/:id` needs no change — and cannot orphan credits — though at the time this was written, in practice an `ordered` sale (the only deletable status) could never have credits. **Post-implementation update (see the phase-12 doc's Addendum):** `DELETE /api/sales/:id` was later opened up to any status, so this cascade is no longer a theoretical guarantee — deleting a `delivered`/`paid` sale with recorded credits now genuinely relies on it, and does still work correctly.
- `pgcrypto` / `gen_random_uuid()` is already installed by `20260323_create_phase1_tables.sql`.
- `recorded_at` and `created_at` hold the same value today because backdating is out of scope. Both columns are kept anyway, mirroring `expenses.purchased_at` vs. `expenses.created_at`: `recorded_at` is the business fact and `created_at` is the row audit trail. Adding an optional client-supplied `recorded_at` later is then purely additive, with no migration and no meaning change.
- No `CHECK` can enforce "sum ≤ total" (it spans rows and tables); that invariant is enforced in the service transaction (§3.3).
- If the migration is applied on a date other than 2026-08-30, rename the file to the actual date — it must sort **after** the two `20260829_*` phase-12 migrations.

### 3.2 Domain schema — `docs/specs/phase-1-domain.json`

Add two `$defs`, following the existing `Expense` / `SaleItem` shape conventions:

```json
"SaleCredit": {
  "type": "object",
  "required": ["id", "sale_id", "amount", "recorded_at"],
  "properties": {
    "id": { "anyOf": [ { "type": "string", "format": "uuid" }, { "type": "string", "minLength": 1 } ] },
    "sale_id": { "type": "string", "format": "uuid" },
    "amount": { "type": "number", "exclusiveMinimum": 0 },
    "notes": { "anyOf": [{ "type": "string", "maxLength": 5000 }, { "type": "null" }] },
    "recorded_at": { "type": "string", "format": "date-time" },
    "created_at": { "type": "string", "format": "date-time" },
    "updated_at": { "type": ["string", "null"], "format": "date-time" }
  },
  "additionalProperties": false
},

"SaleCreditCreate": {
  "type": "object",
  "required": ["amount"],
  "properties": {
    "amount": { "type": "number", "exclusiveMinimum": 0 },
    "notes": { "anyOf": [{ "type": "string", "maxLength": 5000 }, { "type": "null" }] }
  },
  "additionalProperties": false
}
```

`amount` uses `"type": "number", "exclusiveMinimum": 0` (the money convention used by `unit_price`/`price`), **not** the integer form phase 12 applied to quantities — a partial payment of ₡7,500.50 is legitimate. The 2-decimal limit is enforced in the service, not in AJV, because `multipleOf: 0.01` is unreliable against IEEE-754 doubles.

Also extend the existing `Sale` def (it has `additionalProperties: false`, and the detail response now carries more fields):

```diff
   "Sale": {
     "properties": {
       ...
       "items": { "type": "array", "items": { "$ref": "#/$defs/SaleItem" } },
+      "credits": { "type": "array", "items": { "$ref": "#/$defs/SaleCredit" } },
+      "amount_paid": { "type": "number", "minimum": 0 },
+      "balance_due": { "type": "number", "minimum": 0 },
+      "credit_count": { "type": "integer", "minimum": 0 },
```

`validators.Sale` is compiled but not used at runtime today (verified), so this is documentation-accuracy only and cannot change any response.

**Matching runtime validator — `lib/validators.js`** (required; that file declares its request schemas inline and is what the API actually enforces):

```js
const CreateSaleCreditSchema = {
  type: 'object',
  properties: {
    amount: { type: 'number', exclusiveMinimum: 0 },
    notes: { anyOf: [{ type: 'string', maxLength: 5000 }, { type: 'null' }] },
  },
  required: ['amount'],
  additionalProperties: false,
};
```
registered as `SaleCreditCreate: ajv.compile(CreateSaleCreditSchema)`. It must stay identical to the domain file's `SaleCreditCreate`. AJV runs with `coerceTypes: false`, so `"7000"` as a string is rejected.

### 3.3 Query layer — `lib/db/queries/sales.js`

Credits go in the **existing** `sales.js` query module, not a new file. `sale_items` queries already live there, and a credit is part of the sale aggregate with no independent lifecycle — splitting it out would fragment one aggregate across two modules for no benefit. (If `sales.js` later becomes unwieldy, extracting *both* children at once is the right move, not just credits.)

New functions, following the existing `runDbQuery` + named-query style:

```js
listSaleCredits(saleId, db)
// SELECT id, sale_id, amount, notes, recorded_at, created_at, updated_at
// FROM sale_credits WHERE sale_id = $1
// ORDER BY recorded_at ASC, created_at ASC, id ASC   -- stable payment history

getSaleCreditsSummary(saleId, db)
// SELECT COALESCE(SUM(amount), 0) AS amount_paid, COUNT(*) AS credit_count
// FROM sale_credits WHERE sale_id = $1
// -> { amount_paid: normalizeMoney(...), credit_count: toInteger(...) }

getSaleCreditById(saleId, creditId, db)
// SELECT * FROM sale_credits WHERE id = $1 AND sale_id = $2   -- scoped, mirrors getSaleItemById

insertSaleCredit({ sale_id, amount, notes }, db)
// INSERT ... RETURNING *

deleteSaleCreditById(creditId, db)
// DELETE FROM sale_credits WHERE id = $1
```

`getSaleDetailById` is extended to include credits:

```js
export async function getSaleDetailById(id, db, { includeUnit = false } = {}) {
  // ...existing header + lines...
  const credits = await listSaleCredits(id, db);
  const amountPaid = sumMoney(credits.map((c) => c.amount));
  return {
    ...sale,
    lines,
    credits,
    amount_paid: amountPaid,
    balance_due: normalizeMoney(sale.total_amount - amountPaid),
    credit_count: credits.length,
  };
}
```

One extra indexed query per detail fetch; the summary is derived in JS from the rows already fetched rather than issuing a second aggregate query. (`getSaleCreditsSummary` exists for the *write* paths, where the list is not needed.) Every existing caller of `getSaleDetailById` — `createSale`, `cancelSale`, `deleteSale`'s siblings, `transitionSale`, `GET /api/sales/:id` — picks up the new fields automatically, which is intended.

`normalizeMoney` / `sumMoney` are imported from `lib/db/numbers.js`, matching the Phase 7 money policy.

**Also add to `lib/db/numbers.js`:**
```js
export function toCents(value) // Math.round(normalizeMoney(value) * 100)
```
All balance comparisons in the service use `toCents` (R5). Comparing `balance_due === 0` on floats is exactly the kind of check that fails at ₡0.00 after three partial payments.

### 3.4 Service layer — `lib/services/sales.js`

New guard helper (sits beside `assertSaleMutable`):

```js
function assertCreditsMutable(status) {
  if (status === 'paid') {
    throw { status: 409, message: 'cannot modify credits on a paid sale' };
  }
}
```

(Only `deleteSaleCredit` calls this — there is no update path in this phase.)

#### `addSaleCredit(saleId, input)`
Input validation **before** the transaction (400 via the existing `validationError(field, message)` helper):
- `amount` parsed with `toFiniteNumber`; reject if not finite or `<= 0` → `amount must be greater than 0`
- reject if `normalizeMoney(amount) !== amount` → `amount cannot have more than 2 decimals`
- `notes`: optional, trimmed, `''` → `null`, longer than 5000 chars → `notes must be 5000 characters or fewer`

Then inside `runTransaction`:
1. `getSaleStatusRow(saleId, client, { forUpdate: true })` → null ⇒ `{ status: 404, message: 'sale not found' }`. **The `FOR UPDATE` lock is load-bearing**, not cosmetic: it serializes concurrent credit writes on the same sale so the §2.1 balance check cannot be evaluated against stale data.
2. `status !== 'delivered'` ⇒ `{ status: 409, message: \`cannot record a credit on a ${status} sale; credits can only be recorded while a sale is delivered\` }` (R1).
3. `getSaleHeaderById(saleId, client)` for `total_amount`, and `getSaleCreditsSummary(saleId, client)` for `amount_paid`.
4. Overpayment check in cents (R2): if `toCents(amount_paid) + toCents(amount) > toCents(total_amount)` ⇒
   `{ status: 409, message: \`credit of ${amount} exceeds the remaining balance of ${balance_due}\` }`.
5. `insertSaleCredit({ sale_id: saleId, amount: normalizeMoney(amount), notes }, client)`.
6. Return `getSaleDetailById(saleId, client)`.

Returning the full sale detail (rather than just the credit row) matches `cancelSale` / `transitionSale`, and gives the UI the recomputed `balance_due` without a second round trip.

`sales.updated_at` is deliberately **not** touched by credit writes — a credit is a child row, and the sale header itself did not change. (Stated so the implementer doesn't have to guess.)

#### `deleteSaleCredit(saleId, creditId)`
In `runTransaction`: lock the sale → 404 if missing → `assertCreditsMutable(status)` → load the credit (404 if missing) → `deleteSaleCreditById` → return `getSaleDetailById(saleId, client)`. No balance check is needed: removing a credit can only increase the balance.

#### `transitionSale` — two narrow additions
Inserted after the existing from/to status checks and the existing `countSaleLines` check, changing nothing else:

```
// R4 — paid gate
if (toStatus === 'paid') {
  const { amount_paid, credit_count } = await getSaleCreditsSummary(id, client);
  if (credit_count > 0) {
    const { total_amount } = await getSaleHeaderById(id, client);
    const balance = toCents(total_amount) - toCents(amount_paid);
    if (balance > 0) throw { status: 409,
      message: `cannot mark this sale paid; ${formatted balance} is still outstanding across ${credit_count} recorded credit(s)` };
  }
}

// §2.3 — protect a credited sale from becoming mutable again
if (toStatus === 'ordered' || toStatus === 'prepared') {
  const { credit_count } = await getSaleCreditsSummary(id, client);
  if (credit_count > 0) throw { status: 409,
    message: `cannot move this sale back to ${toStatus}; it has ${credit_count} recorded credit(s). Delete them first.` };
}
```

Both branches are no-ops when the sale has no credits, so the un-credited path — the majority path — is untouched. `transitionSale` already runs inside `runTransaction` with the sale row locked `FOR UPDATE`, so these reads are consistent.

The `transition` route currently maps 404/403/400/422 but **not 409**; add `if (err && err.status === 409) return errors.conflict(err.message);` to `app/api/sales/[id]/transition/route.js`.

### 3.5 Routes

The new route file reuses the `isUuid` guard already present in `app/api/sales/[id]/route.js` (copy it, or lift it into a small shared helper — implementer's choice, but do not skip it: without it a malformed id surfaces a raw Postgres `22P02`).

Standard error mapping for all three handlers:
```js
if (err && err.status === 400 && err.payload) return errors.badRequest(err.payload);
if (err && err.status === 404) return errors.notFound(err.message);
if (err && err.status === 409) return errors.conflict(err.message);
throw err;
```

#### `POST /api/sales/:id/credits` — `app/api/sales/[id]/credits/route.js`
Validates the body with `validators.SaleCreditCreate` first (`errors.badRequest(validators.formatErrors(...))` on failure), then calls `addSaleCredit`.

```jsonc
// Request
POST /api/sales/6f1c.../credits
{ "amount": 7000, "notes": "cash, first payment" }

// 201 Created — full sale detail
{
  "id": "6f1c...",
  "customer_id": "a2b3...",
  "customer_name": "María R.",
  "status": "delivered",
  "total_amount": 20000,
  "created_at": "2026-08-20T14:05:00.000Z",
  "updated_at": "2026-08-22T09:00:00.000Z",
  "lines": [ /* unchanged shape */ ],
  "credits": [
    { "id": "c1...", "sale_id": "6f1c...", "amount": 7000,
      "notes": "cash, first payment",
      "recorded_at": "2026-08-29T18:22:10.000Z",
      "created_at": "2026-08-29T18:22:10.000Z", "updated_at": null }
  ],
  "amount_paid": 7000,
  "balance_due": 13000,
  "credit_count": 1
}
```

```jsonc
// 400 — bad amount
{ "errors": { "error": "validation_error",
              "details": [{ "field": "amount", "message": "amount must be greater than 0" }] } }

// 409 — wrong status
{ "error": "cannot record a credit on a prepared sale; credits can only be recorded while a sale is delivered" }

// 409 — overpayment (total 20000, already paid 13000)
{ "error": "credit of 9000 exceeds the remaining balance of 7000" }

// 404 / 400
{ "error": "sale not found" }
{ "errors": [{ "message": "Invalid id format" }] }
```

#### `DELETE /api/sales/:id/credits/:creditId` — `app/api/sales/[id]/credits/[creditId]/route.js`
No body. Returns **200** with the full sale detail (not 204): the balance changed and the client needs the new value. This differs from the phase-12 `DELETE /api/sales/:id` → 204 on purpose — there, the resource is gone and there is nothing to return; here, the parent resource is still on screen. 409 `cannot modify credits on a paid sale` when the sale is paid; 404 `sale credit not found` when the credit does not belong to that sale.

No `PATCH` — correcting a mistaken credit is delete-and-re-add (human-confirmed decision, §7), not in-place editing.

#### No `GET /api/sales/:id/credits`
Credits ship inside `GET /api/sales/:id`, which is the only screen that needs them. A separate collection endpoint would be a second read path to keep in sync for no consumer.

---

## 4. Frontend Design

All changes are in `app/sales/[id]/page.js`. No new page, no new route, no change to `/sales`.

`frontend` must load `.claude/skills/responsive-tailwind-design/SKILL.md` before starting: this page already carries a mobile-card / desktop-table pair for order items, and the new blocks must follow the same mobile-first structure rather than being bolted on as a desktop-only table.

### 4.1 Derived client state
From the `GET /api/sales/:id` payload (all server-provided; the client never recomputes the balance):
```js
const credits      = Array.isArray(sale.credits) ? sale.credits : []
const creditCount  = sale.credit_count ?? credits.length
const balanceDue   = sale.balance_due ?? sale.total_amount
const amountPaid   = sale.amount_paid ?? 0
const showPayment  = sale.status === 'delivered' || creditCount > 0
const canAddCredit = sale.status === 'delivered' && balanceDue > 0
const canEditCredits = sale.status !== 'paid'
const payBlocked   = creditCount > 0 && balanceDue > 0
```
`showPayment` keeps `ordered` / `prepared` sales looking exactly as they do today — the payment UI only appears once it can actually be used.

### 4.2 Payment summary (replaces / extends the Total Amount card)
The existing card stays as-is when `!showPayment`. When `showPayment`, it becomes a three-value block inside the same `rounded-lg border-2 border-primary/20 bg-primary/5 p-4` container:

```
grid grid-cols-1 gap-3 sm:grid-cols-3
  Total Amount   <Amount value={sale.total_amount} />   text-2xl font-bold text-primary
  Paid           <Amount value={amountPaid} />          text-green-700
  Balance        <Amount value={balanceDue} />          text-amber-700 when > 0, text-green-700 when 0
```
Stacked on phones, one row from `sm:` up. Balance is the emphasized value when it is non-zero. Money always renders through the existing `<Amount />` component.

### 4.3 "Record Credit" action + form
- Button **Record Credit**, rendered only when `canAddCredit`, placed in the payment card (not the bottom action row) so it sits next to the balance it changes. Styled as a secondary action: `min-h-11 rounded-md border border-primary/30 px-4 py-2 text-primary` — the bottom row's solid fills stay reserved for lifecycle transitions.
- Clicking it reveals an inline form directly below the summary (same inline-edit pattern as the order-line editor; no modal):
  - **Amount** — `<input type="number" step="0.01" min="0.01" inputMode="decimal">`, **prefilled with the current `balanceDue`** so settling the remainder is one tap, and fully editable for a partial amount.
  - **Notes** (optional) — single-line text input.
  - **Save** / **Cancel** buttons, `min-h-11`, stacked full-width on mobile (`flex flex-col gap-2 sm:flex-row`).
- Client-side pre-checks before the POST (server remains authoritative):
  - `> 0` → `"Amount must be greater than 0"`
  - `<= balanceDue` → `"Amount cannot exceed the balance of <balance>"`
  - at most 2 decimals → `"Amount cannot have more than 2 decimals"`
- On success the response **is** the updated sale, so `setSale(body)` — no refetch. On failure show `body.error || body.message` in the existing red error area (`{error && ...}`), which already handles both the 409 `{error}` and the 400 `{errors}` envelopes (read `body.error` first, then fall back to the details message).
- The form is `disabled` while `busy`, matching every other action on the page.

### 4.4 Credits history list
A **Credits (Partial Payments)** section placed after Order Items, rendered when `creditCount > 0`, mirroring the Order Items structure exactly:
- **Mobile (`lg:hidden`)**: one `rounded-lg border border-gray-200 bg-white p-3` card per credit — date (top line), amount (bold), notes (muted, omitted when null), and a **Delete** action when `canEditCredits` (`min-h-10 rounded border border-red-200 px-3 text-xs font-medium text-red-600`), matching the existing line-item card buttons.
- **Desktop (`hidden lg:block`)**: table with columns Date · Amount · Notes · Actions, `bg-primary/10` header, `divide-y divide-gray-100` body, the same trash icon button used for line items. The Actions column is omitted entirely when `!canEditCredits`.
- A footer row / summary line: `Total paid: <Amount value={amountPaid} />`.
- Dates render with `new Date(c.recorded_at).toLocaleString()` — `recorded_at` is a true instant, **not** a calendar date, so it must use local formatting like `created_at`, and must **not** go through the phase-12 `lib/date.js` calendar-date helpers.
- Delete is confirmed with the existing `ConfirmDialog` (`title="Delete Credit"`, body: "This removes a recorded payment of X and increases the outstanding balance. This cannot be undone."), not `window.confirm` — the phase-12 pattern. Track the pending credit id in state.
- No in-place edit — correcting a mistaken credit is delete, then Record Credit again with the right amount (human-confirmed decision, §7).
- When the sale is `paid`, the list renders read-only with no action affordances — the visible expression of R3.

### 4.5 Mark Paid button
Stays in the bottom action row, still only for `status === 'delivered'`, still `bg-amber-600`. Changes:
- `disabled={busy || payBlocked}` (the existing `disabled:opacity-60` handles the visual).
- When `payBlocked`, a short helper line under the action row: `Record the remaining <Amount value={balanceDue} /> before marking this sale paid.` in `text-sm text-amber-700`.
- When `creditCount > 0 && balanceDue === 0`, the button is enabled and the helper line instead reads `Fully paid — ready to close.` in `text-sm text-green-700`.
- For a sale with **zero credits** the button renders and behaves exactly as it does today, with no helper text.
- The 409 from the server is still surfaced in the error area, so the gate holds even if the button state is stale.

### 4.6 Theming
No new colors. Reuse the tokens already on this page: `text-primary` / `bg-primary/5` / `border-primary/20`, amber for the payment-pending state (already the Mark Paid color), green for settled, red for destructive. If a genuinely new accent is needed, derive it from `public/logo.png` and record it in the theme config rather than hardcoding it inline.

---

## 5. User Flows

1. **Partial payments over time (the human's example).** Sale of ₡20,000 reaches `delivered`. The user opens it and sees Total ₡20,000 / Paid ₡0 / Balance ₡20,000, plus a **Record Credit** button. They record ₡7,000 → Balance ₡13,000, one entry in the credits list; **Mark Paid** is greyed out with "Record the remaining ₡13,000…". A week later they record ₡6,000 → Balance ₡7,000. Later still they record the final ₡7,000 — the amount box is already prefilled with ₡7,000 — → Balance ₡0, "Fully paid — ready to close.", **Mark Paid** enabled. They click it and the sale becomes `paid`; the credits list goes read-only.
2. **Normal full payment (unchanged).** A `delivered` sale with no credits shows the payment card with Balance = Total and an enabled **Mark Paid**. The user clicks it; the sale is paid immediately, exactly as before this phase.
3. **Typo caught.** On a ₡20,000 sale with ₡13,000 already paid, the user types 70000 instead of 7000. The client blocks it with "Amount cannot exceed the balance of ₡7,000"; had it reached the server, the answer would be 409 "credit of 70000 exceeds the remaining balance of 7000".
4. **Wrong amount recorded.** The user recorded ₡6,000 but the customer actually paid ₡6,500. They delete the credit (confirm dialog), the balance goes back up, and they record the correct amount.
5. **Cancellation.** A `delivered` sale with ₡7,000 collected is cancelled. The cancel flow is unchanged, the sale becomes `cancelled`, and the ₡7,000 credit remains visible on the record (still deletable, since the sale is not `paid`). No refund is processed by the system.

---

## 6. Acceptance Criteria

**Data / migration**
- [ ] `20260830_create_sale_credits.sql` applies cleanly, is safely re-runnable, and `\d sale_credits` shows `amount numeric(12,2)` with `CHECK (amount > 0)` and a cascading FK to `sales`.
- [ ] Deleting a sale removes its credits via cascade (no orphan rows).

**Recording and balance**
- [ ] Recording a credit reduces the displayed balance by exactly that amount and appends one entry to the credits list.
- [ ] Three credits of 7000 + 6000 + 7000 against a 20000 sale bring `balance_due` to exactly `0` (verified with a decimal case too, e.g. 6666.67 + 6666.67 + 6666.66 = 20000.00).
- [ ] `amount_paid`, `balance_due`, and `credit_count` appear on `GET /api/sales/:id` and equal `SUM(amount)`, `total_amount − SUM(amount)`, and `COUNT(*)` respectively; a sale with no credits returns `0`, `total_amount`, `0`.
- [ ] A credit that would push the balance below zero is rejected with 409 and no row is written.
- [ ] `amount` of `0`, negative, non-numeric, a string, or with 3+ decimals is rejected with 400 naming the `amount` field.

**Status gating**
- [ ] `POST /api/sales/:id/credits` returns 409 for `ordered`, `prepared`, `paid`, and `cancelled` sales, and succeeds only for `delivered`.
- [ ] Deleting a credit restores the previous balance exactly and is permitted for `delivered` and `cancelled` sales.
- [ ] Once the sale is `paid`, `POST` / `DELETE` on its credits both return 409 and the UI shows no credit action affordances.

**Mark Paid**
- [ ] With `credit_count > 0` and `balance_due > 0`, `POST /api/sales/:id/transition {"to_status":"paid"}` returns 409 naming the outstanding amount, and the UI button is disabled with the explanatory line.
- [ ] With `credit_count > 0` and `balance_due = 0`, the transition succeeds.
- [ ] With `credit_count = 0`, the transition succeeds exactly as before this phase (regression check on the majority path).

**Total integrity**
- [ ] `POST /api/sales/:id/transition {"to_status":"prepared"}` on a `delivered` sale **with** credits returns 409; the same call on a `delivered` sale **without** credits behaves as it did before this phase.
- [ ] `PATCH` / `DELETE` on `sale_items` of a `delivered` sale still return the existing "cannot edit/delete items on a delivered sale" error, so `total_amount` cannot move while credits exist.

**General**
- [ ] Two concurrent credit requests on the same sale cannot jointly exceed `total_amount` (the second one 409s).
- [ ] 400 for malformed sale/credit uuids; 404 for an unknown sale or for a credit id belonging to a different sale.
- [ ] The sale detail page is usable at 320–430px: payment summary stacks, credits render as cards, and all buttons have ≥44px touch targets with no horizontal scroll.
- [ ] `npm run lint` and `npm run build` pass; no new npm dependency was added.

---

## 7. Deliverables Summary

**New migration**
- `migrations/20260830_create_sale_credits.sql`

**Spec/domain updates (architect-owned, applied as part of this phase)**
- `docs/specs/phase-1-domain.json` — add `SaleCredit`, `SaleCreditCreate`; extend `Sale` with `credits` / `amount_paid` / `balance_due` / `credit_count`
- `lib/validators.js` — add the matching inline `CreateSaleCreditSchema` + `SaleCreditCreate` validator (implementation work, but the shape comes from the domain file and must not diverge)

**New backend files**
- `app/api/sales/[id]/credits/route.js` (POST)
- `app/api/sales/[id]/credits/[creditId]/route.js` (DELETE)

**Modified backend**
- `lib/db/queries/sales.js` — five credit query functions (`listSaleCredits`, `getSaleCreditsSummary`, `getSaleCreditById`, `insertSaleCredit`, `deleteSaleCreditById`); `getSaleDetailById` extended
- `lib/db/numbers.js` — `toCents`
- `lib/services/sales.js` — `addSaleCredit`, `deleteSaleCredit`, `assertCreditsMutable`; two narrow additions to `transitionSale`
- `app/api/sales/[id]/transition/route.js` — map service 409 → `errors.conflict`

**Modified frontend**
- `app/sales/[id]/page.js` — payment summary, Record Credit form, credits list (delete only, no inline edit), Mark Paid gating

**Human-confirmed trim:** no `PATCH` / in-place credit edit in this phase. Correcting a mistaken credit is delete-and-re-add; the confirmed mutability rule ("credits are deletable while the sale isn't fully paid") is fully honored by delete alone.

## 8. Dependencies / Notes

- Builds on phases 1–12. Depends on phase 12 only for conventions (409 usage, `ConfirmDialog` for destructive actions, `isUuid` guard); it does not modify anything phase 12 added except adding a 409 mapping to the transition route.
- `backend` and `frontend` can work in parallel from this document — the contracts in §3.5 are concrete enough to build the UI before the endpoints exist.
- **Migration runner gap (carried over from phase 12):** `package.json` defines `test:backend` as `node tests/test_migrations_and_sales.js`, but there is no `tests/` directory in the repo. `backend` must confirm with the human how migrations are applied (manual `psql -f`, or restoring the runner) before applying this one. Otherwise verify via `npm run lint`, `npm run build`, and manual API checks against a live `DATABASE_URL`.
- Take a database backup (`npm run backup:db`) before applying the migration to production, per repo practice — though this migration only creates a new table and touches no existing data.
- **Out-of-scope observation (not part of this phase):** `transitionSale` has no from-status check for `to_status: 'prepared'`, so `delivered → prepared` and `cancelled → prepared` are both accepted by the API today. §2.3 closes this only for sales that have credits. Tightening the state machine in general is worth a future phase and should be decided deliberately, since it may break other current usage.
- **Candidate future phases**, deliberately not designed here: a customer-level account/ledger spanning sales; an "outstanding balances / cash collected" report covering `delivered` sales with a partial balance (§2.6); refund or reconciliation handling for cancelled sales that already collected money (§2.5); backdating `recorded_at`; payment method/reference fields on a credit.

---
Stop: do NOT implement or delegate yet. Wait for explicit human approval.
