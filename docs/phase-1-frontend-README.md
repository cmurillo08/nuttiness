# Phase 1 Frontend

Run the dev server (from project root):

```bash
pnpm dev
# or
npm run dev
```

Notable pages (App Router):

- `/dashboard` — KPIs for products, raw products, expenses, sales
- `/raw-products` — list raw products
- `/raw-products/new` — create raw product
- `/raw-products/[id]` — edit raw product
- `/products` — list prepared products
- `/products/new` — create prepared product
- `/products/[id]` — edit prepared product
- `/expenses` — list expenses
- `/expenses/new` — create expense
- `/sales` — sales index
- `/sales/new` — build and submit an order

POST /api/sales example (fetch):

```js
fetch('/api/sales', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    lines: [ { product_id: 1, qty: 2, unit_price: 120.5 } ],
    total_amount: 241.0
  })
}).then(r => r.json()).then(console.log)
```

Notes & acceptance:
- The frontend uses lightweight React local state and Tailwind classes.
- Forms use `EntityForm` with client-side validation; backend validation messages are shown when returned.
- `OrderBuilder` computes totals client-side and POSTs to `/api/sales`.

Outstanding items / TODO for Architect or maintainer:
- Auth integration (routes currently public).
- Pagination and list filters for large datasets.
- The exact API shapes should be reviewed; components are defensive but may require minor adaptation.
