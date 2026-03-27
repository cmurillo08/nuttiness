# Phase 7: Database Access Refactor

## Overview
Refactor the backend database access layer to keep the current Postgres + raw SQL approach while improving organization, consistency, and separation of responsibilities.

This phase is an internal architecture cleanup. It does not introduce new database tables and does not replace raw SQL with an ORM.

## Objectives
1. Preserve raw SQL as the primary persistence strategy.
2. Remove SQL strings and database orchestration from API route handlers.
3. Introduce a clear boundary between HTTP handling, domain/application rules, and persistence queries.
4. Standardize transaction usage, numeric handling, and shared aggregate/reporting queries.
5. Improve maintainability without changing the product behavior.

## Scope

### Included
- Refactor of backend folder responsibilities for database access.
- Extraction of SQL from route handlers into dedicated query modules or SQL files.
- Definition of a thin application/service layer for multi-step write flows.
- Standard rules for transaction boundaries.
- Standard rules for parsing and returning numeric monetary values.
- Shared query ownership for dashboard stats and reporting aggregates.
- Lightweight database observability guidance for query timing and slow-query logging.

### NOT Included
- New database tables.
- Large schema redesign.
- ORM adoption.
- Frontend redesign.
- Changes to approved business rules.
- New end-user features.
- New reports beyond existing stats/summary behavior.

## Current Problems Being Solved
- API route files currently mix:
  - HTTP request parsing
  - validation flow
  - SQL statements
  - transaction orchestration
  - response formatting
- Similar aggregate logic exists in more than one endpoint, creating risk of drift.
- Numeric conversions are performed ad hoc in handlers.
- Multi-step writes are handled case by case instead of following one explicit architecture rule.
- Database concerns are centralized only at the connection helper level, not at the query ownership level.

## Target Architecture

### Responsibility Split

#### API Routes
Own only:
- request parsing
- invoking validators
- calling one application/query entry point
- mapping expected failures to HTTP responses
- returning response payloads

API routes should not own raw SQL text except possibly trivial health-check style queries.

#### Query Layer
Own only:
- raw SQL statements
- parameter binding
- row shape retrieval
- read-model assembly directly tied to SQL results

This layer keeps the current performance characteristics of raw SQL while making query ownership explicit.

#### Application / Use-Case Layer
Own only:
- multi-step workflows
- transaction orchestration
- cross-query coordination
- computed persistence-side totals already required by approved domain rules

This layer is especially important for sales creation, sale updates, and any future multi-statement write path.

#### Domain / Validation Layer
Own only:
- business validation rules already defined by approved specs
- reusable validation helpers
- invariant enforcement that should not be duplicated in routes or query modules

## Proposed Backend Structure

A simple target structure is:

- `lib/db.js`
  - pool management
  - transaction helper
  - shared DB instrumentation hooks
- `lib/db/queries/`
  - one module per aggregate or entity area
  - examples: `sales.js`, `expenses.js`, `customers.js`, `reports.js`, `stats.js`
- `lib/db/sql/`
  - optional home for larger SQL statements if inline strings become too large
- `lib/services/`
  - orchestration for multi-step write use cases
  - examples: sale creation/update flows, cancellation/transition flows
- `lib/serializers/` or existing response helpers
  - optional place for shared output normalization if needed

This structure should stay thin. The goal is not a heavy repository pattern.

## Refactor Rules

### 1. Keep Raw SQL
- Continue using Postgres directly.
- Keep parameterized SQL.
- Do not add an ORM.
- Prefer explicit SQL for performance-sensitive or reporting queries.

### 2. Move SQL Out of Routes
- List/detail endpoints should call dedicated query functions.
- Report/stat endpoints should reuse shared aggregate query functions.
- Route files should become small and predictable.

### 3. Standardize Transactions
- Any use case that writes to more than one table must go through one transaction boundary.
- Transaction ownership belongs in the application/service layer, not the route.
- Query modules should accept a client/connection when participating in a shared transaction.

### 4. Standardize Money/Numeric Handling
- Define one rule for converting Postgres numeric values to API-safe numbers or strings.
- Use the same conversion policy in stats, reports, sales totals, and expense totals.
- Avoid repeated ad hoc `Number(...)` / `parseFloat(...)` patterns across routes.

### 5. Centralize Shared Aggregates
- Dashboard stats and reports must not compute overlapping totals independently.
- Shared financial totals should be defined once and reused.
- Current shared sales totals remain based on `paid` orders only; this refactor must preserve that behavior.
- If reporting semantics differ by endpoint in the future, that difference must be intentional and explicitly documented.

### 6. Add Lightweight Observability
- Add named query logging or timing at the DB layer.
- Log slow queries and query failures consistently.
- Keep logging minimal and operational, not verbose.

## Suggested Execution Order

### Step 1: Define Internal Contracts
- Identify every route that currently contains raw SQL.
- Group them by domain area:
  - raw products
  - prepared products
  - expenses
  - sales
  - customers
  - stats/reports
- Define the query function surface for each area before moving code.

### Step 2: Extract Read Queries First
- Move list/detail/search/report reads into query modules.
- Keep route response shapes unchanged.
- Use this step to establish naming patterns.

### Step 3: Extract Multi-Step Write Flows
- Move create/update/cancel/transition flows into service modules.
- Make services the only place that own transaction orchestration.
- Keep route handlers focused on HTTP and validation outcomes.

### Step 4: Normalize Cross-Cutting DB Behavior
- Standardize numeric parsing.
- Standardize not-found and conflict handling conventions.
- Standardize query naming/logging.

### Step 5: Consolidate Reporting/Stats Logic
- Reconcile shared totals used by `/api/stats` and `/api/reports/summary`.
- Ensure one canonical definition for financial aggregates.
- Preserve the existing `paid`-only sales-total calculation while consolidating query ownership.

## Domain Considerations
- No new entities are introduced.
- No new database tables are required.
- Existing approved business rules remain the source of truth.
- This phase is architectural and must not silently redefine totals, statuses, or domain meanings.

## Backend Design

### Affected Areas
Expected backend refactor coverage includes:
- `/api/raw-products`
- `/api/products`
- `/api/expenses`
- `/api/sales`
- `/api/customers`
- `/api/stats`
- `/api/reports/summary`

### Internal Contracts to Define
For each domain area, define:
- read queries
- write queries
- optional transaction-aware variants
- response shaping boundaries
- shared aggregate functions where applicable

### Stability Requirement
- External API routes and payloads should remain stable unless a separate approved phase changes them.
- This phase should primarily improve maintainability and internal clarity.

## Frontend Impact
- No required UI redesign.
- No planned route changes.
- Frontend should remain unaffected if API contracts remain stable.

## Acceptance Criteria
- [ ] API route handlers no longer embed medium or large raw SQL statements.
- [ ] Read queries are grouped by domain area in dedicated backend query modules.
- [ ] Multi-step write workflows are moved behind a thin service/use-case layer.
- [ ] Transaction boundaries are explicit and consistent across multi-table writes.
- [ ] One shared strategy exists for money/numeric conversion.
- [ ] Shared financial totals are defined once and reused by stats/reporting endpoints.
- [ ] Existing external API contracts remain stable unless separately approved.
- [ ] No new database tables are introduced.
- [ ] No ORM is introduced.

## Dependencies / Notes
- This phase depends on the existing phases already implemented for products, expenses, sales, customers, and reporting.
- Phase 6 documentation contains an outdated note about broader sales inclusion; for this phase, existing behavior is authoritative and shared sales totals remain restricted to `paid` orders only.
- Backend Agent should preserve the current raw SQL strategy and focus on query ownership, service boundaries, and transaction discipline.
- Frontend Agent is not expected to make changes unless a backend contract unexpectedly shifts.

---
Stop: do NOT implement or delegate yet. Wait for explicit human approval.
