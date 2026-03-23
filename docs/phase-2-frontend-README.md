# Phase 2 Frontend — Products

This document lists the new frontend pages and how to run the dev server.

Pages added
- `/products` — list prepared products with search and pagination
- `/products/new` — create a prepared product
- `/products/[id]` — edit/view a prepared product
- `/raw-products` — list raw products with search and pagination
- `/raw-products/new` — create a raw product
- `/raw-products/[id]` — edit/view a raw product

How to run
- Start the dev server at the project root:

```bash
npm run dev
# or
yarn dev
```

Notes
- Lists call `GET /api/products` and `GET /api/raw-products` with `limit` and `offset` query params. The pages send `limit` and `offset` in query string.
- Create uses `POST /api/products` and `POST /api/raw-products`.
- Edit uses `PUT /api/products/:id` and `PUT /api/raw-products/:id`.
- Forms perform client-side validation guided by Phase 2 JSON Schemas (see `docs/specs/phase-2-domain.md`) and surface server validation errors if the backend returns `errors` in the JSON body.
- No authentication implemented — pages assume local/dev backend is reachable at the same origin.

Open decisions
- Pagination UX is offset-based (simple Prev/Next). Consider switching to page numbers or server-provided `total` in a follow-up.
- Search is performed client-side on the page-level subset returned by the backend. If you need server-side search/filtering, the backend endpoints must accept `q` or similar.

