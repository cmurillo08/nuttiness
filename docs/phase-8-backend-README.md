# Phase 8 Backend Design Note

## Summary
Phase 8 is a navigation-shell refactor only. Backend scope is limited to confirming that existing APIs and data contracts remain unchanged, preserving report endpoints, and reviewing whether dashboard-only endpoint `/api/stats` can be safely deprecated or removed after frontend adoption of the sidebar shell.

## Existing routes/endpoints impacted

### Routing-adjacent pages to coordinate with frontend
- `/` currently redirects to `/dashboard`; Phase 8 should change the destination to the approved default working page (`/sales`).
- `/dashboard` should become a legacy route that redirects to `/sales` instead of rendering a standalone dashboard.

### Backend/API endpoints to review
- `GET /api/stats`
  - Current role: serves dashboard count and total cards.
  - Current known consumer: dashboard page only.
  - Phase 8 status: candidate for deprecation or removal once the dashboard UI is retired and no other frontend usage remains.
- `GET /api/reports/summary`
  - Must remain available.
  - Continues to support the reports page and must not be removed as part of dashboard cleanup.

### Existing operational APIs expected to remain unchanged
- `/api/products`
- `/api/raw-products`
- `/api/expenses`
- `/api/sales`
- `/api/customers`
- `/api/reports/summary`

No request/response contract changes are required for these endpoints in Phase 8.

## API/data model impact
- No new API routes are required for sidebar navigation.
- No database schema changes or migrations are required.
- No domain entities, business rules, validation semantics, or persisted navigation records are introduced.
- Existing backend payloads for products, raw products, expenses, sales, customers, and reports remain semantically unchanged.
- `GET /api/stats` is not part of the approved long-term navigation model; however, its underlying metrics query is currently shared with reports summary, so only the endpoint is a deprecation candidate, not necessarily the shared data-access helper.

## Redirect/route behavior considerations
- Redirect behavior for `/` and `/dashboard` is a routing concern only and should not change API payloads or backend business invariants.
- Recommended routing outcome per approved plan:
  - `/` -> `/sales`
  - `/dashboard` -> `/sales`
- Backend should treat these redirects as application-entry behavior, not as a new workflow state or business rule.
- If route handlers or middleware are used for redirects, they should avoid creating duplicate analytics/report semantics tied to dashboard usage.

## Cleanup/deprecation guidance for dashboard-only endpoints
- Perform a final usage check after frontend sidebar work is complete.
- If no active client depends on `GET /api/stats`, prefer retiring that endpoint in Phase 8.
- If immediate removal is judged risky, mark `GET /api/stats` as deprecated and schedule removal in the next cleanup pass.
- Do not remove `lib/db/queries/metrics.js` solely because `/api/stats` is retired; `GET /api/reports/summary` currently depends on the same metrics source.
- If future cleanup narrows the shared metrics helper, preserve report semantics and response shape for `/api/reports/summary`.

## Validation or risk notes
- Primary risk: removing `/api/stats` too early could break the legacy dashboard page or any overlooked consumers.
- Primary coupling note: report summary currently reuses dashboard-oriented metrics retrieval; cleanup should avoid accidental regression in reports.
- No new backend validation rules are required because Phase 8 introduces no new write flows or payload shapes.
- Reports must remain reachable and semantically unchanged even though dashboard counts leave the main user flow.
- Safe removal should be confirmed against all current frontend references before implementation.

## Acceptance criteria
- [ ] Backend design introduces no new APIs for sidebar navigation.
- [ ] Backend design introduces no schema or domain-model changes.
- [ ] Existing operational endpoints remain unchanged in contract and purpose.
- [ ] `GET /api/reports/summary` is explicitly preserved.
- [ ] `GET /api/stats` is documented as dashboard-only and reviewed for safe deprecation/removal after frontend migration.
- [ ] Root `/` and legacy `/dashboard` redirect behavior is treated as routing-only, with no backend business-logic change.
- [ ] No business logic is redefined in this phase.

## Stop note
No code yet. This is a design-only backend note for Phase 8 and is waiting for approval before any implementation or cleanup work proceeds.
