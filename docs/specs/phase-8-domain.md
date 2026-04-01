---
phase: 8
title: Phase 8 — Domain Spec (Sidebar Navigation Shell)
summary: Domain confirmation for Phase 8: a navigation and application-shell refactor with no new persisted entities, no schema changes, and no business-rule or calculation changes.
---

## 1. Overview

Phase 8 is an application navigation refactor. It replaces the dashboard-as-home pattern with a persistent left sidebar that gives users direct access to the existing operational sections of the app.

From a domain perspective, this phase is intentionally minimal. It does **not** introduce new business entities, new calculations, new persistence requirements, or revised business semantics. Existing approved domain definitions from Phases 1–7 remain authoritative for products, raw products, expenses, sales, customers, reporting, and shared aggregates.

## 2. Scope

### Included
- Domain confirmation that the new sidebar is an application navigation concept, not a persisted business entity.
- Preservation of existing domain semantics for:
  - `RawProduct`
  - `PreparedProduct`
  - `Expense`
  - `Sale`
  - `Customer`
  - `FinancialReport`
  - existing shared list/report contracts from prior phases
- Route-entry clarification that `/` and legacy `/dashboard` may redirect to an operational page without changing the meaning of any business object or workflow.
- Removal of dashboard counts from the primary user flow while leaving underlying report and business concepts unchanged.

### NOT Included
- New business entities, value objects, or aggregates.
- New database tables, columns, or schema migrations.
- New inventory, pricing, reporting, or sales rules.
- New totals, metrics, KPIs, or derived business calculations.
- Any reinterpretation of report semantics, sale lifecycle semantics, or customer/product ownership rules.

## 3. Domain Model

### Summary

Phase 8 introduces no new persisted domain model. The business model remains the same; only the application entry and navigation pattern changes.

### Entities / Domain Responsibilities Involved

#### Existing Entities (unchanged)

- `RawProduct`
  - Remains the business representation of purchased input inventory.
  - No field, lifecycle, or validation changes.

- `PreparedProduct`
  - Remains the sellable finished product definition.
  - No pricing, composition, or status changes.

- `Expense`
  - Remains the record of a purchase/cost event.
  - No change to total calculation, ownership, or reporting contribution.

- `Sale`
  - Remains the customer-facing order/transaction aggregate.
  - No change to status meaning, line-item behavior, or total calculation.

- `Customer`
  - Remains the party associated with sales/customer management flows.
  - No identity, validation, or relationship changes.

- `FinancialReport`
  - Remains a read-only reporting concept defined in earlier phases.
  - Dashboard counts being removed from the user flow do not alter report semantics or formulas.

#### Application Navigation Concepts (non-persisted)

These concepts may be used by implementation teams for navigation behavior, but they are **not** business entities and must not be modeled as persisted domain records.

- `NavigationShell`
  - Description: shared application container that exposes global navigation and content placement.
  - Domain role: none beyond organizing access to existing bounded areas of the application.
  - Persistence: none.

- `NavigationItem`
  - Description: an application navigation reference such as Sales, Expenses, Raw Products, Products, Customers, or Reports.
  - Domain role: points users to an existing workflow or read model; does not create or modify domain meaning.
  - Persistence: none.

### Relationships

- `NavigationShell` contains an ordered set of `NavigationItem` references.
- Each `NavigationItem` maps to an existing application section that already operates on approved domain concepts.
- `NavigationItem` does **not** own, extend, or redefine any business entity.
- Root and legacy dashboard redirects map users to an existing operational section; they do not create a new business relationship or alter existing ownership/cardinality rules.
- Existing entity relationships from prior phases remain unchanged, including:
  - customer-to-sale relationships
  - sale-to-line-item/product relationships
  - expense-to-raw-product relationships
  - report-to-underlying-transaction aggregation rules

### Business Rules

- Navigation items are application navigation concepts, not persisted domain entities.
- Sidebar presence changes how users move between sections, not how business operations behave within those sections.
- Removing dashboard counts from the user flow does not remove or redefine underlying report/business concepts.
- Existing reports remain valid even if dashboard summary cards are no longer shown as a landing experience.
- Root-route redirects and legacy `/dashboard` redirects do not alter domain semantics; they only change entry behavior.
- Existing create, edit, list, detail, and reporting workflows must preserve the business rules approved in prior phases.
- No new permissions, workflow states, or approval gates are introduced by this phase.

### Derived Values

- No new derived business values are introduced in Phase 8.
- No existing totals, counts, profit formulas, inventory formulas, or sale calculations are changed.
- Any active-navigation indication is route-derived application state, not a persisted or reportable business metric.
- Dashboard counts may disappear from the primary navigation flow, but any surviving report totals remain governed by earlier approved domain formulas.

### Validation Rules

- No new business validation rules are introduced for existing entities.
- Existing validation rules for products, expenses, sales, customers, pagination, and reporting remain unchanged.
- Navigation configuration should reference valid existing sections only, but this is an application-configuration concern rather than a domain validation rule.
- Redirect behavior for `/` and `/dashboard` must resolve to valid existing sections without implying a new domain state.

## 4. Backend Design

Phase 8 has no required backend domain-contract expansion.

- No new business APIs are required for the sidebar itself.
- Existing APIs for products, raw products, expenses, sales, customers, and reports remain semantically unchanged.
- Any cleanup of dashboard-only endpoints is a safe-deprecation concern, not a domain-model change.
- Shared reporting endpoints remain valid because report/business concepts are unchanged even though dashboard counts are removed from the primary user flow.
- Root and legacy dashboard redirects are routing/entry concerns only and must not change API payload meaning or business invariants.

## 5. Frontend Design

From a domain perspective, frontend behavior should reflect the same approved workflows under a different navigation shell.

- The sidebar should expose existing sections only; it must not imply new business categories or workflows.
- Active-state indication is a navigation affordance only.
- Replacing repeated “Back to Dashboard” shortcuts with persistent sidebar navigation does not change task semantics for creating, editing, viewing, or reporting on records.
- Reports remain an existing business read model reachable from the sidebar, not a new reporting domain.
- The removal of dashboard cards from the main entry flow must not be interpreted as removal of the underlying aggregates or historical records.

## 6. Acceptance Criteria

- [ ] Phase 8 introduces no new persisted business entities, aggregates, or schema changes.
- [ ] Existing entities (`RawProduct`, `PreparedProduct`, `Expense`, `Sale`, `Customer`, `FinancialReport`) remain semantically unchanged.
- [ ] Navigation items are explicitly treated as application navigation concepts, not domain entities.
- [ ] No new business rules, calculations, totals, or validation rules are introduced.
- [ ] Dashboard counts are removed from the user flow without changing the meaning of existing reports or business aggregates.
- [ ] Redirects from `/` and legacy `/dashboard` are documented as entry/navigation behavior only, with no domain-semantic effect.
- [ ] Existing report, sales, expense, customer, and product concepts remain governed by previously approved specs.
- [ ] Backend and frontend implementation teams can complete this phase without redefining any domain logic.
