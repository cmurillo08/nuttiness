# Phase 14: Date Range Filter for Sales & Expenses Lists

## Overview

`/sales` and `/expenses` are the two **transaction logs** in this app: they grow forever, one row per real-world event, and in daily use nobody looks at anything more than a few weeks old. Today `GET /api/sales` and `GET /api/expenses` count and page over the *entire* table, so "Showing 1 to 25 of 4,312" and a page-1 view that is only ever the newest slice of an ever-growing pile.

This phase adds a **date range filter** to those two list endpoints and their pages, defaulting to the **last 90 days**, with a visible control to switch to 30 / 60 / 90 days or **All time**.

The default matters, but the *control* matters more: the human explicitly said they are not sure 90 is the right number ("not sure if should be a new filter that could change later on to 30, 60, all whatever"). So this is designed as a real, human-adjustable filter — not a hardcoded cutoff that would have to be redeployed to change.

This builds on phases 1–12 and follows the Phase 7 architecture: routes stay thin and only parse/validate request params, SQL lives in `lib/db/queries/*`. It composes with the phase-12 pagination and sorting contract without redesigning either.

## Objectives

1. Add an optional `range` query param to `GET /api/sales` and `GET /api/expenses`, whitelisted to `30` / `60` / `90` / `all`, defaulting to `90`.
2. Apply the range as a `WHERE` filter on the entity's business date **before** counting and paginating, so `total` reflects the filtered set.
3. Keep the phase-12 response envelope (`{ items, total, limit, offset }`) and sorting behavior byte-for-byte unchanged.
4. Expose a "Date range" `<select>` on `/sales` and `/expenses`, alongside the filter control each page already has, resetting to page 1 on change.
5. Change nothing about reports, other list endpoints, the domain schema, or the database.

## Scope

### Included

- New shared param parser `lib/dateRange.js` (mirrors `lib/sorting.js`).
- New shared SQL helper `buildDateRangeFilter` in `lib/db/queries/_shared.js` (sits beside `buildOrderBy`).
- `listSales` / `countSales` / `listExpenses` / `countExpenses` accept and apply the range.
- `app/api/sales/route.js` and `app/api/expenses/route.js` parse `range` and pass it to **both** the list and the count query.
- A "Date range" select on `app/sales/page.js` and `app/expenses/page.js`, wired into the existing fetch + pagination state.
- An optional `emptyMessage` prop on `components/EntityTable.jsx` so an empty result can say *why* it is empty.

### NOT Included

- **Any other endpoint or page.** `raw-products`, `products`, and `customers` are untouched (§1.1).
- **Reports.** `/api/reports/summary`, `top-products`, `top-customers`, `sales-monthly` and `getDashboardStats` all keep their own existing scoping/windowing rules (§1.6).
- **Anything from phase 13 (sale credits).** Orthogonal; no interaction to design (§1.7).
- **Arbitrary day counts or explicit from/to dates.** `?range=137`, `?from=2026-01-01&to=2026-03-01` are out of scope and return 400 (§1.3).
- **A new migration or domain-schema change.** This is a request-parameter concern on existing, already-indexed columns (§2.7).
- **Persisting the chosen range** across navigations/sessions via URL or localStorage (§1.5).
- **Server-side default changes for `limit`.** Pagination defaults stay exactly as Phase 6 set them.
- Fixing the two pre-existing `/expenses` filter defects noted in §7 (the ignored `raw_product_id` param, and the raw-product select not resetting `offset`).

---

## 1. Decisions

The judgment calls this phase makes, stated inline with reasoning rather than left implicit (phase-12 / phase-13 convention).

### 1.1 Only `sales` and `expenses` get a date range

`raw_products`, `prepared_products`, and `customers` are **catalogs**, not time series: tens of rows, changing slowly, and every row stays relevant indefinitely. Hiding a raw product because it was created 91 days ago would be actively wrong — the user would go looking for an ingredient they still buy every week and not find it.

`sales` and `expenses` are the opposite: one row per event, unbounded growth, and old rows are archive material rather than working data. That asymmetry is the whole justification for the feature, and it does not apply to the other three.

If the human later wants a range control somewhere else, it is a per-table decision (which column? is old data really irrelevant there?) and belongs to its own phase. Do not generalize it now.

### 1.2 Which date column each entity filters on

| Entity | Column | Why |
|---|---|---|
| Sale | `sales.created_at` | Already the phase-12 default sort key (`SORTABLE.created_at` in `lib/db/queries/sales.js`) and the column the list renders as the "Created" column. A sale has no separate business date; creation *is* the event. |
| Expense | `expenses.purchased_at` | Already the phase-12 default sort key and the column rendered as "Purchased At". This is the business-meaningful date (when the purchase happened), **not** `created_at` (when the row was typed in). |

Filtering on the column each list already sorts by and displays means the filter is self-explanatory on screen: the visible date column and the range control talk about the same thing. Filtering expenses on `created_at` would produce the confusing case where an expense dated 4 months ago but entered yesterday shows up inside "last 30 days".

### 1.3 Whitelisted enum, not an arbitrary number of days or a date pair

`range` accepts exactly `30`, `60`, `90`, `all`. Anything else → 400.

Reasoning:
- It mirrors how phase 12 validated `sort` / `order` (`lib/sorting.js`: whitelist, 400 on anything unknown, never interpolate the raw value into SQL). One validation idiom in the codebase instead of two.
- The UI only ever sends one of four values, so accepting `?range=417` would be surface area with no consumer, and it invites the "what's the max?" question (an unbounded day count is just `all` with extra steps).
- A `from` / `to` pair is a different, larger feature (two date pickers, cross-field validation, empty-range handling, "does `to` include that whole day?"). Phase 12 already listed "date-range filters on reports" as out of scope; if the human ever wants true arbitrary ranges, that is a follow-up phase and this enum is forward-compatible with it (`range=custom&from=…&to=…` could be added additively).

Adding a fifth option later (e.g. `180`, or `7`) is a one-line change to `ALLOWED_RANGES` plus one `<option>`.

### 1.4 Cutoff is computed in UTC, truncated to the start of the day

**Decision: follow the phase-12 precedent and compute the cutoff in UTC**, truncated to midnight:

```
cutoff = UTC midnight of (today_UTC − N days)
predicate = <date_column> >= cutoff
```

Two sub-decisions, both deliberate:

**(a) UTC, not `America/Costa_Rica`.** Phase 12 §7.2 chose UTC month bucketing for the monthly sales report so results are identical across the dev machine, Neon, and Vercel — whose Postgres/session `TimeZone` settings differ. Using a different timezone basis here would mean the app has two competing definitions of "when does a day start", and the one that shifts with the server's configuration is the one that breaks in production only. The business really does run at UTC−6, so a sale recorded late in the evening local time is stamped the next UTC day and can land on the far side of the boundary — but at a 90-day (or even 30-day) horizon, one day of slop at the *oldest* edge of the window has no operational consequence. Nobody's decision changes because a record from 90 days ago is or isn't visible.

If the human ever wants local-day semantics, it is a one-line change (`AT TIME ZONE 'America/Costa_Rica'` instead of `'UTC'` in the cutoff expression in §2.3) and should be made once, for both this filter and the phase-12 monthly report, so they stay consistent.

**(b) Truncated to day start, not a rolling instant.** `now() - 90 days` would be, e.g., `2026-05-31T14:22:00Z`. Every expense is stored at UTC **midnight** of its calendar day (the phase-12 §3.2 calendar-date convention), so a rolling cutoff would silently drop the entire oldest day for expenses — "last 90 days" would return 89 days plus a stub. Truncating to `2026-05-31T00:00:00Z` makes the boundary a clean calendar day for both entities.

Consequence, stated so nobody trips on it: the window is inclusive of both today and the day exactly N days ago, i.e. **N+1 UTC calendar days**. `range=90` on 2026-08-29 returns everything on or after `2026-05-31T00:00:00Z`. This is the friendly rounding (a filter that shows one extra day is never the bug report); using `N-1` to make the count exact would drop the boundary day, which is the reading users complain about.

### 1.5 The chosen range resets to 90 days on every visit

**Decision: component state only. No URL param, no localStorage.**

This matches every other list control in the app today: `sort` / `order` reset to the entity default (phase 12 §6.4 explicitly declared "no URL persistence in this phase"), the sales `status` filter resets to "All", the expenses raw-product filter resets to "All raw products". Making `range` the single sticky control would be an inconsistency the user has to learn, and a sticky filter is the classic source of "where did my data go?" — the user narrows to 30 days on Monday, comes back Thursday, and quietly can't find a sale.

Resetting to the 90-day default on every visit also means the default keeps doing its job (fast, relevant list) instead of being overridden forever by one exploratory click.

If persistence is wanted later, the right form is URL query params on all list controls at once (shareable/bookmarkable, back-button correct) — a small dedicated phase, not a one-off for this control.

### 1.6 Reports are not touched

`GET /api/reports/summary`, `/api/reports/top-products`, `/api/reports/top-customers`, `/api/reports/sales-monthly`, and `getDashboardStats` are **unchanged** by this phase — no `range` param, no behavior change.

They already have their own, independently-decided scoping rules from phase 12 §7: paid-only status scoping, a `months` window on the monthly chart, and all-history totals on the Financial Summary card. Bolting this list-oriented filter onto them would either (a) change what the Financial Summary card means, or (b) create a second windowing concept sitting next to `months`. Reports answer "how is the business doing"; a list range answers "what am I working on right now". Different questions, different controls.

A range/period selector on `/reports` is a plausible future phase. Do not design it here.

### 1.7 No interaction with phase 13 (sale credits)

Phase 13 (plan-only, unimplemented) touches `GET /api/sales/:id`, the sale detail page, and adds credit routes. This phase touches `GET /api/sales` (the collection) and the sales list page. They overlap in exactly one file, `lib/db/queries/sales.js`, and each adds different functions there. Whichever lands first, the other applies cleanly; neither depends on the other.

### 1.8 The response envelope does not echo `range`

The response stays `{ items, total, limit, offset }`. Phase 12 made the same call for `sort` / `order` ("echoing back is optional and not required by the frontend"), and the client already knows the range it asked for — it is the one holding the state. Adding a field to a shared envelope that no consumer reads is contract surface for nothing.

---

## 2. Backend Design

### 2.1 Query param contract

Applies to `GET /api/sales` and `GET /api/expenses` only, alongside the existing `limit` / `offset` (Phase 6) and `sort` / `order` (Phase 12).

| Param | Type | Values | Default | Invalid |
|---|---|---|---|---|
| `range` | string | `30` \| `60` \| `90` \| `all` | `90` | 400 |

Rules:
- Omitted → `90`. **The default is applied server-side**, so an old client, a curl call, or a bookmark all get the same narrowed list.
- `all` → no date predicate at all; full history.
- The value is whitelisted before it reaches SQL and is **never** interpolated into a query string; the validated value is bound as a query parameter (§2.3).
- The predicate is applied identically to the list query and the count query, so `total` always describes the rows the filter actually returns (§2.5). This is the single most important correctness rule in the phase — a filtered list with an unfiltered `total` produces a pager with empty pages at the end.
- Sorting is unaffected and composes normally: `?range=30&sort=customer_name&order=asc` sorts the last-30-days subset by customer name.
- The name `range` was chosen over `days` because `days=all` reads as a contradiction, and over `period` because "period" suggests a named accounting period (month/quarter) rather than a trailing window. `range` is consistent across both endpoints.

Error response (matching the phase-12 `sort` error shape):

```jsonc
// GET /api/sales?range=180
400
{ "errors": [{ "field": "range", "message": "range must be one of: 30, 60, 90, all" }] }
```

### 2.2 New module — `lib/dateRange.js`

Mirrors `lib/sorting.js` exactly in shape and responsibility: parse and validate the request-side param, nothing else. No SQL, no DB import, no Node-only dependency — so a client component may import the constants from it and stay in sync with the server whitelist.

```js
export const ALLOWED_RANGES = ['30', '60', '90', 'all'];
export const DEFAULT_RANGE = '90';

/**
 * @param {URL} url
 * @returns {{ range: string, rangeDays: number|null, errors: Array|null }}
 *   range     - the validated token ('30' | '60' | '90' | 'all')
 *   rangeDays - integer day count, or null for 'all' (no filter)
 */
export function parseDateRangeParam(url, { allowed = ALLOWED_RANGES, defaultRange = DEFAULT_RANGE } = {})
```

Behavior:
- `range` absent → `{ range: defaultRange, rangeDays: 90, errors: null }`.
- `range` present and in `allowed` → that value; `rangeDays = null` when it is `all`, otherwise `parseInt(value, 10)`.
- `range` present and not in `allowed` (including an empty string) → `errors: [{ field: 'range', message: \`range must be one of: ${allowed.join(', ')}\` }]`.
- Default export `const dateRange = { parseDateRangeParam, ALLOWED_RANGES, DEFAULT_RANGE }`, matching how routes already import `pagination` / `sorting`.

Returning `rangeDays` (an integer or `null`) rather than the raw token is what keeps the query layer from ever having to know the string `'all'`, and it keeps the *default* in exactly one place — the parser — so the list and count calls in a route cannot drift apart.

### 2.3 Cutoff SQL

The whitelisted value selects a fixed, safe expression; the day count is bound as a parameter. No user-supplied text ever reaches the SQL string.

```sql
-- $k is the validated integer day count
<column> >= (date_trunc('day', now() AT TIME ZONE 'UTC') - make_interval(days => $k::int)) AT TIME ZONE 'UTC'
```

Notes for the implementer:
- `now() AT TIME ZONE 'UTC'` converts the current `timestamptz` to a UTC wall-clock `timestamp`; `date_trunc('day', …)` gives UTC midnight; the trailing `AT TIME ZONE 'UTC'` converts back to `timestamptz` **interpreting the value as UTC**. That round trip is what makes the result independent of the server/session `TimeZone` (§1.4a). Do not simplify it to `date_trunc('day', now())` — that truncates in the session timezone and will behave differently on Neon than locally.
- `now()` is `STABLE` and the rest of the expression is immutable, so the planner can still use the b-tree index on the date column.
- `$k::int` is explicit so Postgres does not have to infer the parameter type through `make_interval`'s named argument.

Worked example (today = 2026-08-29 UTC):

| `range` | cutoff | meaning |
|---|---|---|
| `30` | `2026-07-30T00:00:00Z` | rows on/after Jul 30 |
| `60` | `2026-06-30T00:00:00Z` | rows on/after Jun 30 |
| `90` | `2026-05-31T00:00:00Z` | rows on/after May 31 |
| `all` | — | no predicate |

### 2.4 New shared helper — `lib/db/queries/_shared.js`

**Decision: shared helper, not inlined per query module.** It goes next to `buildOrderBy`, for the same reason phase-12 consolidation put `buildOrderBy` there:

- There are **four** call sites, not two: `listSales`, `countSales`, `listExpenses`, `countExpenses`. The list/count pair for one entity must produce a *byte-identical* predicate or `total` silently disagrees with `items` — which is exactly the bug this phase exists to avoid, and exactly the bug that copy-paste produces.
- The expression in §2.3 is short but non-obvious (the double `AT TIME ZONE`). Four copies means four chances to "simplify" one of them and quietly reintroduce the timezone dependence.

```js
/**
 * Build a safe date-range predicate for the whitelisted `range` param
 * (see lib/dateRange.js). `columnExpr` is a fixed, module-owned column
 * reference — never user input — and the day count is bound as a
 * parameter, so nothing from the request is interpolated into SQL.
 *
 * @param {string} columnExpr - e.g. 's.created_at'
 * @param {number|null} rangeDays - integer day count, or null for "all"
 * @param {number} paramIndex - 1-based index this clause's parameter will occupy
 * @returns {{ clause: string|null, values: number[] }}
 */
export function buildDateRangeFilter(columnExpr, rangeDays, paramIndex)
```

- `rangeDays == null` → `{ clause: null, values: [] }` (no filter).
- `Number.isInteger(rangeDays) && rangeDays > 0` → `{ clause: '<columnExpr> >= (…$paramIndex::int…)', values: [rangeDays] }`.
- Anything else → `{ clause: null, values: [] }`, mirroring `buildOrderBy`'s "unknown key falls back to the default" defense-in-depth stance. This branch is unreachable in practice because the route rejects invalid values first; it exists so a future internal caller cannot crash the query by passing garbage.

### 2.5 Query layer

**`lib/db/queries/sales.js`**

Add a module-level constant so list and count reference the same column, and alias the count query's table so both pass the *identical* string:

```js
const DATE_RANGE_COLUMN = 's.created_at';
```

`listSales({ limit, offset, status, rangeDays = null, sort, order }, db)` — replace the single-condition `where` with an accumulator so `status` and the range compose:

```js
const values = [limit, offset];
const conditions = [];

if (status) {
  values.push(status);
  conditions.push(`s.status = $${values.length}`);
}

const range = buildDateRangeFilter(DATE_RANGE_COLUMN, rangeDays, values.length + 1);
if (range.clause) {
  values.push(...range.values);
  conditions.push(range.clause);
}

const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
```

`countSales({ status, rangeDays = null } = {}, db)` — collapse the current two-branch (`sales.count` / `sales.countByStatus`) shape into the same accumulator, over `FROM sales s` so `DATE_RANGE_COLUMN` applies unchanged:

```sql
SELECT COUNT(*) AS count FROM sales s <where>
```

**`lib/db/queries/expenses.js`**

```js
const DATE_RANGE_COLUMN = 'e.purchased_at';
```

`listExpenses({ limit, offset, rangeDays = null, sort, order }, db)` gains the same accumulator (it currently has no `WHERE` at all), inserted between the `FROM … LEFT JOIN …` and the `buildOrderBy(...)` clause.

`countExpenses({ rangeDays = null } = {}, db)` — **signature change**: it currently takes `(db)` as its only argument. It becomes `(options, db)` to match `countSales`, and its SQL becomes `SELECT COUNT(*) AS count FROM expenses e <where>`. The only caller is `app/api/expenses/route.js` (§2.6); the implementer must update it in the same commit or the `db` argument silently lands in `options`.

Common notes:
- `rangeDays = null` (no filter) is the query-function default so an internal caller that omits it never silently narrows results. The *90-day default* lives in `lib/dateRange.js` and is applied by the route — one place, so the list and count calls in a route cannot diverge.
- The `name` field on `runDbQuery` configs is a **logging label only** — `lib/db.js#executeQuery` calls `target.query(config.text, config.values)` and drops `name`, so it is never sent to Postgres and there is no prepared-statement-name collision risk from the now-variable SQL text. Keep the existing names; do not add per-combination names.
- Every other function in both modules (`getExpenseById`, `createExpense`, `getSaleDetailById`, …) is untouched. The filter applies to collection reads only; fetching a specific old sale or expense by id must keep working regardless of the range.

### 2.6 Route layer

**`app/api/sales/route.js`** — add one parse step, mirroring the existing `sorting.parseSortParams` block, and thread `rangeDays` into **both** queries:

```js
import dateRange from '../../../lib/dateRange';
…
const { rangeDays, errors: rangeErrors } = dateRange.parseDateRangeParam(url);
if (rangeErrors) {
  return errors.badRequest(rangeErrors);
}

const status = url.searchParams.get('status');

const rows  = await listSales({ limit, offset, status, rangeDays, sort, order });
const total = await countSales({ status, rangeDays });
```

**`app/api/expenses/route.js`** — identical, minus `status`:

```js
const rows  = await listExpenses({ limit, offset, rangeDays, sort, order });
const total = await countExpenses({ rangeDays });
```

Validation order stays: pagination → sort → range, each returning `errors.badRequest(...)` on the first failure. `POST` handlers in both files are untouched.

No other route parses `range`. `GET /api/raw-products`, `/api/products`, `/api/customers` simply ignore an unknown query param, exactly as they ignore anything else today — they do **not** start returning 400 for `?range=…`.

### 2.7 No migration, no domain change

- **No migration.** This is a query-time predicate on existing columns. Both are already indexed by phase 12: `idx_sales_created_at` and `idx_sales_status_created_at` (which also covers the `status` + range combination), and `idx_expenses_purchased_at`. Nothing to create.
- **No domain-schema change.** `docs/specs/phase-1-domain.json` and `lib/validators.js` are untouched. `range` is a request parameter, not part of any entity's shape, and no response field is added or removed (§1.8).

### 2.8 Endpoint contracts

#### `GET /api/sales`

```
GET /api/sales
→ 200   (range defaults to 90)
```
```jsonc
{
  "items": [
    {
      "id": "6f1c…", "customer_id": "a2b3…", "customer_name": "María R.",
      "status": "delivered", "total_amount": 20000,
      "created_at": "2026-08-27T14:05:00.000Z",
      "updated_at": "2026-08-28T09:00:00.000Z"
    }
  ],
  "total": 142,      // sales with created_at >= 2026-05-31T00:00:00Z ONLY
  "limit": 25,
  "offset": 0
}
```

```
GET /api/sales?range=30&status=paid&sort=customer_name&order=asc&limit=25&offset=0
→ 200   { "items": [ … ], "total": 38, "limit": 25, "offset": 0 }
        // paid sales from the last 30 days, A→Z by customer

GET /api/sales?range=all
→ 200   { "items": [ … ], "total": 4312, "limit": 25, "offset": 0 }
        // full history; identical to this endpoint's behavior before this phase

GET /api/sales?range=180
→ 400   { "errors": [{ "field": "range", "message": "range must be one of: 30, 60, 90, all" }] }

GET /api/sales?range=90&sort=price
→ 400   { "errors": [{ "field": "sort", "message": "sort must be one of: created_at, customer_name" }] }
```

#### `GET /api/expenses`

```
GET /api/expenses
→ 200   (range defaults to 90)
```
```jsonc
{
  "items": [
    {
      "id": "b7d2…", "raw_product_id": "44aa…", "quantity": 3,
      "cost": 27000, "purchased_at": "2026-08-20T00:00:00.000Z",
      "notes": null, "created_at": "2026-08-20T18:02:00.000Z", "updated_at": null,
      "raw_product": { "id": "44aa…", "name": "Almonds", "price": 9000, "supplier": "Distribuidora X" }
    }
  ],
  "total": 61,       // expenses with purchased_at >= 2026-05-31T00:00:00Z ONLY
  "limit": 25,
  "offset": 0
}
```

```
GET /api/expenses?range=60&sort=raw_product_name&order=asc
→ 200   { "items": [ … ], "total": 44, "limit": 25, "offset": 0 }

GET /api/expenses?range=all
→ 200   full history, identical to pre-phase behavior

GET /api/expenses?range=7
→ 400   { "errors": [{ "field": "range", "message": "range must be one of: 30, 60, 90, all" }] }
```

Empty result at any range is a normal `200` with `items: []` and `total: 0` — never an error (Phase 6 rule).

---

## 3. Frontend Design

Two pages change, in the same way. `frontend` should load `.claude/skills/responsive-tailwind-design/SKILL.md` first — both pages have an existing filter row that now becomes a two-control row, and the mobile stacking has to stay clean.

### 3.1 Shared shape of the change

Each page gains:

```js
import { DEFAULT_RANGE } from "../../lib/dateRange"      // client-safe: no node/db imports
…
const [range, setRange] = useState(DEFAULT_RANGE)        // "90"
```

- The fetcher adds `qs.set('range', range)` and `range` to its `useCallback` dependency array, so changing it refetches through the existing effect — no new fetch path.
- The change handler is inline, mirroring the existing status select exactly:
  ```jsx
  onChange={(e) => { setOffset(0); setRange(e.target.value) }}
  ```
  **Decision: no third factory in `lib/list-page-client.js`.** That module exists because `createSortChangeHandler` has real branching (toggle the active key vs. select a new one and look up its `defaultOrder`) and `createDeleteSuccessHandler` has the offset-after-delete arithmetic — logic worth having in exactly one place. `setOffset(0); setRange(v)` is two statements with no branches; wrapping it would add an import and a layer of indirection larger than the code it hides, and it would be *less* consistent with the sibling `status` select sitting two lines away, which is written inline today.
- Resetting `offset` to 0 on change is mandatory: the user could be on page 4 of 90-day data and switch to 30 days, where page 4 does not exist.

### 3.2 The control

```jsx
<div className="flex flex-col gap-2 sm:max-w-xs">
  <label htmlFor="range-filter" className="text-sm">Date range:</label>
  <select
    id="range-filter"
    value={range}
    onChange={(e) => { setOffset(0); setRange(e.target.value) }}
    className="min-h-11 rounded border p-2.5"
  >
    <option value="30">Last 30 days</option>
    <option value="60">Last 60 days</option>
    <option value="90">Last 90 days</option>
    <option value="all">All time</option>
  </select>
</div>
```

- `min-h-11` (44px) and `p-2.5` match the existing selects on both pages — do not introduce a new size.
- `htmlFor` / `id` are added here (the existing labels on these pages are bare `<label>`s); this is a small a11y improvement on the new control only, not a refactor of the existing ones.
- Option labels live in the page, allowed values come from `ALLOWED_RANGES` in `lib/dateRange.js` — so the client can never offer an option the server would reject.

### 3.3 `app/sales/page.js`

The current single-filter block:

```jsx
<div className="flex flex-col gap-2 sm:max-w-sm">
  <label className="text-sm">Status:</label>
  <select …>
```

becomes a two-control row:

```jsx
<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
  {/* Date range (as in §3.2) */}
  {/* Status (unchanged markup, wrapped in the same flex-col gap-2 sm:max-w-xs container) */}
</div>
```

Stacked full-width on phones, side by side from `sm:` up, wrapping rather than shrinking. **Date range goes first** on both pages, because it is the control that is always doing something (it is never "All" by default), whereas Status / Raw Product default to unfiltered — the always-active filter should be the one the eye hits first. Keep the ordering identical on both pages.

Empty state — the page's own message becomes range-aware, so a filtered-empty list explains itself instead of implying there are no sales at all:

```jsx
{!loading && !items.length && (
  <div className="text-sm text-gray-500">
    {range === 'all' ? 'No sales found.' : `No sales in the last ${range} days.`}
  </div>
)}
```

Nothing else on the page changes: `SalesTable`, `COLUMNS`, sorting, delete, and `Pagination` are all untouched. `Pagination`'s "Showing X to Y of Z" is automatically correct because `total` is now the filtered count (§2.1).

### 3.4 `app/expenses/page.js`

Same treatment: wrap the existing `RawProductSelect` block and the new Date range block in the `sm:flex-row` row, date range first.

`EntityTable` renders this page's empty state (`"No items found."` at `components/EntityTable.jsx:158`), so give it an optional prop rather than duplicating a table:

- `components/EntityTable.jsx`: new optional prop `emptyMessage`, defaulting to `"No items found."` — `{!loading && !items.length && <div className="text-sm text-gray-500">{emptyMessage}</div>}`. Every existing caller that does not pass it renders exactly the same text as today.
- `app/expenses/page.js` passes `emptyMessage={range === 'all' ? 'No expenses found.' : \`No expenses in the last ${range} days.\`}`.

The `filterRawProduct` state, the `mapped` transform, sorting, and pagination are untouched.

### 3.5 Theming

No new colors, no new components, no new dependency. The control reuses the existing bordered-select styling already on both pages. If a genuinely new accent were ever needed it should be derived from `public/logo.png` and recorded in the theme config rather than hardcoded inline — not expected to be needed here.

---

## 4. User Flows

1. **Default daily use.** The wife opens `/sales`. Without touching anything she sees "Last 90 days" selected and a list of the recent sales; the pager reads *Showing 1 to 25 of 142* — 142 being sales from the last 90 days, not the 4,312 in the table. Same on `/expenses`.
2. **Narrowing.** She switches the Date range to "Last 30 days". The list refetches, jumps back to page 1, the count drops to 38, and the sort she had chosen (say, by Customer A→Z) still applies within the narrower window.
3. **Looking further back.** The human needs to reconcile something from March. He opens `/expenses`, picks "All time", and gets the full history back, paged and sortable exactly as before this phase.
4. **Empty window.** A quiet stretch means no expenses in the last 30 days. The table shows "No expenses in the last 30 days." rather than "No items found.", so nobody concludes the data is gone.
5. **Deep-linked old record still works.** A bookmark to `/sales/<id>` for a sale from last year opens normally — the range filter applies to list reads only.
6. **Changing the default later.** The human decides 60 is better. `DEFAULT_RANGE` in `lib/dateRange.js` changes from `'90'` to `'60'`; server default, client initial state, and both pages follow, with no other edit.

---

## 5. Acceptance Criteria

**Default and range values**
- [ ] `GET /api/sales` with no `range` param returns only sales with `created_at >= UTC midnight of (today − 90 days)`, and `GET /api/expenses` only expenses with `purchased_at >= ` the same cutoff.
- [ ] `range=30` and `range=60` return strictly narrower subsets of the `range=90` result on both endpoints.
- [ ] `range=all` returns the full history on both endpoints — byte-identical to the pre-phase response for the same `limit`/`offset`/`sort`/`order`.
- [ ] A record dated exactly N days ago (UTC) is **included** at `range=N`; a record dated N+1 days ago is excluded (boundary check, §1.4b).
- [ ] The cutoff is identical when the Postgres session `TimeZone` is `UTC` and when it is `America/Costa_Rica` (verify with `SET TimeZone`).

**Pagination integrity**
- [ ] `total` equals the count of rows matching the active range at every value (`30`, `60`, `90`, `all`), including `total: 0` with `items: []` on an empty window — a 200, never an error.
- [ ] With more filtered rows than `limit`, paging to the last page returns a partial-but-non-empty page (i.e. `total` never overstates and produces trailing empty pages).
- [ ] `total` for `range=all` equals the row count of the table (with `status` unset, for sales).

**Composition with phase 12**
- [ ] `?range=30&sort=customer_name&order=asc` (sales) and `?range=30&sort=raw_product_name&order=asc` (expenses) sort the *filtered* set correctly across page boundaries.
- [ ] `?range=30&status=paid` (sales) applies both predicates; `total` reflects both.
- [ ] Omitting `sort`/`order` still produces today's default ordering within the filtered window.

**Validation**
- [ ] `range=180`, `range=7`, `range=abc`, `range=` and `range=ALL` each return 400 with `{ "field": "range", … }` and the allowed-values message.
- [ ] A bad `limit`/`offset` or a bad `sort`/`order` still returns its own existing 400 (validation order unchanged).

**Regression — untouched surfaces**
- [ ] `GET /api/raw-products`, `/api/products`, `/api/customers` are unchanged, including when passed `?range=30` (ignored, 200, full results).
- [ ] `GET /api/reports/summary`, `/top-products`, `/top-customers`, `/sales-monthly` and the dashboard stats return exactly the same numbers as before this phase.
- [ ] `GET /api/sales/:id` and `GET /api/expenses/:id` return records older than the range window without error.
- [ ] Creating, editing, and deleting sales and expenses behave exactly as before.

**Frontend**
- [ ] `/sales` and `/expenses` each show a "Date range" select defaulting to "Last 90 days", placed before the page's existing filter, with a ≥44px touch target.
- [ ] Changing the range resets to page 1 (`offset = 0`) and refetches exactly once.
- [ ] Changing the range preserves the active sort and the page's other filter.
- [ ] Navigating away and back resets the range to "Last 90 days" (§1.5).
- [ ] An empty filtered result reads "No sales / No expenses in the last N days"; at "All time" it reads the generic message.
- [ ] The other four list pages render an unchanged empty state after the `EntityTable` `emptyMessage` prop is added.
- [ ] Both filter rows stack cleanly at 320–430px with no horizontal scroll, and sit side by side from `sm:` up.

**General**
- [ ] No new migration, no change to `docs/specs/phase-1-domain.json` or `lib/validators.js`, no new npm dependency.
- [ ] `npm run lint` and `npm run build` pass.

---

## 6. Deliverables Summary

**New**
- `lib/dateRange.js` — `parseDateRangeParam`, `ALLOWED_RANGES`, `DEFAULT_RANGE`

**Modified — backend**
- `lib/db/queries/_shared.js` — add `buildDateRangeFilter`
- `lib/db/queries/sales.js` — `DATE_RANGE_COLUMN`; `listSales` and `countSales` accept/apply `rangeDays` (`countSales` collapses its two named-query branches into one condition accumulator)
- `lib/db/queries/expenses.js` — `DATE_RANGE_COLUMN`; `listExpenses` accepts/applies `rangeDays`; **`countExpenses` signature changes** from `(db)` to `(options, db)`
- `app/api/sales/route.js` — parse `range`, pass `rangeDays` to both `listSales` and `countSales`
- `app/api/expenses/route.js` — parse `range`, pass `rangeDays` to both `listExpenses` and `countExpenses` (update the call for the new signature)

**Modified — frontend**
- `app/sales/page.js` — `range` state, Date range select, filter row layout, range-aware empty message
- `app/expenses/page.js` — same, plus `emptyMessage` passed to `EntityTable`
- `components/EntityTable.jsx` — optional `emptyMessage` prop, defaulting to today's text

**Not touched:** any migration, `docs/specs/phase-1-domain.json`, `lib/validators.js`, `lib/sorting.js`, `lib/pagination.js`, `lib/list-page-client.js`, `lib/pagination-client.js`, every `/api/reports/*` route, `lib/db/queries/{rawProducts,products,customers,metrics,reports}.js`, and all detail pages.

## 7. Dependencies / Notes

- Builds directly on phase 12 (pagination + sorting contract, the `_shared.js` helper convention, the phase-12 indexes on `sales.created_at` and `expenses.purchased_at`). Requires no work from phase 13 and blocks none of it (§1.7).
- `backend` and `frontend` can work in parallel from this document: §2.1 and §2.8 pin the query-param contract and response shapes precisely enough for the UI to be built and manually exercised before the endpoints ship (the frontend change degrades gracefully — an unimplemented backend just ignores `range` and returns everything).
- **`countExpenses` is a breaking signature change.** It is called in exactly one place (`app/api/expenses/route.js`), but `backend` must change both in the same commit; passing the old `db` argument positionally into the new `options` parameter would silently disable the filter on the count and desync `total`.
- **No migration in this phase**, so the standing migration-runner gap (`npm run test:backend` points at a `tests/` directory that does not exist — noted in phases 12 and 13) does not block it. Verify with `npm run lint`, `npm run build`, and manual API checks against a live `DATABASE_URL`.
- Worth seeding a handful of deliberately old rows (e.g. 100, 200, 400 days back) in the dev database before verifying — on a small/new dataset every range value returns the same rows and the acceptance checks are vacuous.
- **Out-of-scope observations on `/expenses`, recorded so they are not mistaken for part of this phase** (both pre-existing, both one-liners the human may choose to fold in):
  1. The page sends `raw_product_id` but `GET /api/expenses` still ignores it — the "Raw Product" filter does nothing. First noted in phase 12 §NOT-included; still true. The new Date range select will therefore be the first *working* filter on that page.
  2. `<RawProductSelect onChange={setFilterRawProduct} />` does not reset `offset` to 0, unlike the sales Status select. Harmless only because the filter itself is inert today; it becomes a real bug the moment (1) is fixed.
- **Candidate future phases, deliberately not designed here:** an arbitrary `from`/`to` custom range (§1.3); a range/period selector on `/reports` (§1.6); URL-persisted list state covering `sort`/`order`/`range`/`status`/`limit` together (§1.5); a per-table decision to extend ranges to other entities (§1.1).

---
Stop: do NOT implement or delegate yet. Wait for explicit human approval.
