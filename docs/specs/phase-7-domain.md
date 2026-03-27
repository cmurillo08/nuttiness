---
phase: 7
title: Phase 7 — Domain Spec (Database Access Refactor)
summary: Internal architecture/domain specification for Phase 7: preserve Postgres + raw SQL, separate route/query/service/validation responsibilities, standardize transaction boundaries, shared aggregates, and numeric handling without changing approved business semantics.
---

## 1. Overview

Phase 7 is an internal refactor of backend database access. It preserves the current Postgres + raw SQL approach while making ownership boundaries explicit between HTTP handling, persistence queries, application workflows, and validation/domain rules.

This phase does **not** introduce new entities, new tables, new end-user features, or new business semantics. Existing approved specs from Phases 1–6 remain the source of truth for statuses, totals, validations, and response contracts.

## 2. Scope

### Included
- Internal responsibility split between API routes, query modules, service/use-case modules, and validation/domain rules.
- Extraction of raw SQL from route handlers into dedicated query ownership by domain area.
- Explicit transaction rules for multi-step write workflows.
- One shared policy for numeric/money normalization across sales, expenses, stats, and reporting.
- Shared ownership of overlapping financial aggregates used by dashboard stats and report summaries.
- Lightweight database observability conventions at the DB helper/query boundary.

### NOT Included
- New tables, columns, or schema redesign.
- ORM adoption or abstraction away from raw SQL.
- New report formulas, new stats, or changed business rules.
- Frontend redesign, route changes, or API contract redesign.
- Silent changes to sale status meaning, report semantics, or monetary field semantics.

## 3. Domain Model

Phase 7 adds no new persisted business entities. It defines internal architectural domain roles and invariants for existing entities.

### Internal Roles

- `API Route Handler`
  - Parses request input.
  - Invokes existing validators.
  - Calls exactly one primary query entry point or service/use-case entry point.
  - Maps expected domain/application failures to HTTP responses.
  - Returns the existing response shape.
  - Does **not** own medium/large SQL, transaction orchestration, or duplicated business rules.

- `Query Module`
  - Owns raw SQL text, parameter binding, row retrieval, and SQL-specific read-model shaping.
  - Is organized by domain area: raw products, prepared products, expenses, sales, customers, and shared reporting/stats.
  - May expose read functions and write primitives.
  - Must accept a caller-supplied DB client/transaction context when participating in a shared transaction.
  - Does **not** own HTTP concerns or business workflow decisions.

- `Service / Use-Case Module`
  - Owns multi-step workflows, cross-query coordination, and transaction boundaries.
  - Is the only layer allowed to coordinate writes across multiple statements/tables.
  - May compute persistence-side derived values already approved by earlier phases, such as authoritative sale totals.
  - Does **not** redefine domain rules; it applies existing approved rules.

- `Validation / Domain Rules`
  - Own existing validation helpers and invariants already approved in prior phases.
  - Remain authoritative for lifecycle rules, required fields, allowed status transitions, and server-side total calculations.
  - Must not be duplicated independently in routes and query modules.

- `Shared Aggregate Contract`
  - Represents read-only financial totals reused by both stats and reporting endpoints.
  - Must have one canonical query owner so overlapping totals are not recomputed independently in multiple routes.
  - For current financial totals, sales inclusion remains limited to `paid` orders only.
  - Does not create a new persisted entity.

- `Money/Numeric Normalization Policy`
  - Cross-cutting domain contract for converting Postgres `numeric` values into the existing API-safe response format.
  - Applies uniformly to money totals, unit prices, line totals, expense totals, and shared aggregates.
  - Phase 7 requires one shared implementation path; it does not approve changing external number-vs-string semantics without separate approval.

### Invariants

- Existing entities (`RawProduct`, `PreparedProduct`, `Expense`, `Sale`, `SaleLine`, `Customer`, `FinancialReport`) remain semantically unchanged.
- Approved sales lifecycle and total-calculation rules from earlier phases remain authoritative.
- Routes are transport adapters; services own workflow; queries own SQL; validators own rules.
- Multi-statement writes must execute inside one explicit service-owned transaction boundary.
- Shared financial aggregates must be defined once and reused.
- Shared sales totals for stats/reporting remain `paid`-only during this refactor.
- Numeric/money normalization must be consistent across all endpoints that expose the same underlying values.

## 4. Backend Design

### Responsibility Split

- **API routes** under `app/api/**`
  - Own request parsing, validator invocation, one service/query call, error-to-HTTP mapping, and response return.
  - Should remain small and predictable.

- **Query layer** under a dedicated DB query area
  - Owns parameterized raw SQL and row mapping.
  - Should group functions by domain area rather than by route file.
  - May use inline SQL or SQL files for large statements, but ownership stays with the query layer.

- **Service/use-case layer** under a dedicated services area
  - Owns create/update/cancel/transition workflows and any future multi-step write flow.
  - Coordinates multiple query calls and opens/commits/rolls back transactions.

- **Validation/domain helpers** under existing validation/domain modules
  - Continue to enforce previously approved rules.
  - Provide reusable validation and invariant checks for services/routes.

### Transaction Boundaries

- Single-query reads normally execute without an explicit transaction unless a specific consistency requirement already exists.
- Any workflow that writes to more than one table, or depends on read-then-write consistency, must run inside one service-owned transaction.
- Query functions participating in a workflow must accept the active client/connection from the service.
- Routes must not begin, commit, or roll back transactions directly.

### Shared Aggregates for Stats and Reports

- Overlapping totals used by `/api/stats` and `/api/reports/summary` must come from one canonical aggregate query owner.
- Endpoint-specific response shaping may differ, but the underlying formulas and inclusion/exclusion rules must not drift.
- For this refactor, shared sales totals remain based on `paid` orders only; the refactor must preserve the current calculation.
- If a future phase wants different financial semantics, that change must be documented and approved separately, not inferred during refactor.

### Numeric and Money Handling

- Postgres `numeric` values must pass through one shared normalization path before leaving the backend.
- Ad hoc conversion patterns scattered across routes are out of scope after this refactor.
- The refactor must preserve the current external payload contract for each endpoint unless separately approved.
- Rounding or formatting rules already approved in prior phases remain unchanged.

### Error and Observability Boundaries

- Query/service layers may emit structured internal failures such as not-found, validation, or conflict conditions.
- Routes remain responsible for HTTP status mapping.
- DB helper/query execution may add lightweight query naming, timing, slow-query logging, and failure logging without changing business behavior.

## 5. Frontend Design

No required frontend redesign is introduced in Phase 7.

- Existing pages, components, and routes should continue to work against stable API contracts.
- No new UI flows are required.
- Any frontend change caused by an accidental backend contract shift is considered a regression, not part of this phase.
- If monetary field representation or reporting semantics need to change, that requires separate architect/human approval before frontend work.

## 6. Acceptance Criteria

- [ ] No new database tables, columns, or business entities are introduced.
- [ ] Raw SQL remains the persistence approach; no ORM is introduced.
- [ ] API route handlers no longer own medium/large SQL statements.
- [ ] Query ownership is grouped by domain area for raw products, prepared products, expenses, sales, customers, and shared reporting/stats.
- [ ] Multi-step write workflows execute through a thin service/use-case layer.
- [ ] Service/use-case modules own transaction boundaries for multi-statement writes.
- [ ] Query functions can participate in a caller-owned transaction context.
- [ ] Existing validation and domain rules are reused rather than redefined in routes or query modules.
- [ ] One shared numeric/money normalization strategy is used across sales, expenses, stats, and reports.
- [ ] Shared financial aggregates are defined once and reused by overlapping endpoints.
- [ ] Shared sales totals for stats/reporting continue to use `paid` orders only.
- [ ] External API payloads and approved business semantics remain stable unless separately approved.
