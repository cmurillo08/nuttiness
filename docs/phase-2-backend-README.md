Phase 2 Backend — Migration & API examples

Migration

- The migration file for Phase 2 is: migrations/20260324_add_phase2_product_fields.sql
- It adds `cost_price` (nullable numeric(12,4)) to `prepared_products` and `supplier` (text) to `raw_products`.
- To apply with `psql` (replace connection details as appropriate):

```bash
psql "$DATABASE_URL" -f migrations/20260324_add_phase2_product_fields.sql
```

API Examples

Defaults: list endpoints support `limit` (default 100, max 1000) and `offset`.

Create a RawProduct

```bash
curl -X POST -H "Content-Type: application/json" \
  --data '{"name":"Whole Wheat Flour","unit":"kg","unit_price":3.2500,"unit_size":1.0000,"supplier":"Local Mill","notes":"Organic"}' \
  http://localhost:3000/api/raw-products
```

Create a PreparedProduct

```bash
curl -X POST -H "Content-Type: application/json" \
  --data '{"name":"Sourdough Loaf","unit":"each","price":4.5000,"cost_price":2.1000,"recipe_notes":"Starter + flour"}' \
  http://localhost:3000/api/products
```

Update (PATCH) a PreparedProduct

```bash
curl -X PATCH -H "Content-Type: application/json" \
  --data '{"price":4.7500}' \
  http://localhost:3000/api/products/<id>
```

Get list of products with pagination

```bash
curl "http://localhost:3000/api/products?limit=50&offset=100"
```

Error handling
- 400: validation errors (response body contains `errors` array).
- 404: resource not found.
- 409: uniqueness/constraint conflict from DB (e.g., duplicate keys).

Open items (requires Architect input)
- Whether to create a `prepared_product_recipes` table in Phase 2 (currently deferred).
- Confirm if `unit_price` should be aliased as `purchase_price` in API responses/endpoints.
