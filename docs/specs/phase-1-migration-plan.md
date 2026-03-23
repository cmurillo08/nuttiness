## Phase 1 — Postgres Migration Plan

Target: Postgres (>=12). Uses UUID primary keys and numeric precisions to avoid floating-point errors.

1) Extensions

```sql
-- Prefer pgcrypto for gen_random_uuid(); alternate: "uuid-ossp" with uuid_generate_v4().
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

2) Tables (DDL)

```sql
-- Raw products (ingredients)
CREATE TABLE raw_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit text NOT NULL,
  unit_price numeric(12,4) NOT NULL CHECK (unit_price >= 0),
  unit_size numeric(12,4) NOT NULL CHECK (unit_size > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- Prepared products (catalog)
CREATE TABLE prepared_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(12,4) NOT NULL CHECK (price >= 0),
  unit text NOT NULL,
  recipe_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- Expenses (purchase records of raw products)
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_product_id uuid NOT NULL,
  quantity numeric(12,4) NOT NULL CHECK (quantity > 0),
  unit_cost numeric(12,4) NOT NULL CHECK (unit_cost >= 0),
  purchased_at timestamptz NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  CONSTRAINT fk_expense_raw_product FOREIGN KEY (raw_product_id) REFERENCES raw_products(id) ON DELETE RESTRICT
);

-- Sales (aggregate)
CREATE TABLE sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text,
  status text NOT NULL CHECK (status IN ('prepared','delivered','paid','cancelled')),
  total_amount numeric(12,4) NOT NULL CHECK (total_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- Sale items (line items)
CREATE TABLE sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL,
  prepared_product_id uuid NOT NULL,
  quantity numeric(12,4) NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,4) NOT NULL CHECK (unit_price >= 0),
  line_total numeric(12,4) NOT NULL CHECK (line_total >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  CONSTRAINT fk_saleitem_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  CONSTRAINT fk_saleitem_prepared_product FOREIGN KEY (prepared_product_id) REFERENCES prepared_products(id) ON DELETE RESTRICT
);
```

3) Index recommendations

```sql
-- FK lookups and common queries
CREATE INDEX idx_expenses_raw_product_id ON expenses(raw_product_id);
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_prepared_product_id ON sale_items(prepared_product_id);

-- Filters and reporting
CREATE INDEX idx_raw_products_name ON raw_products( lower(name) );
CREATE INDEX idx_prepared_products_name ON prepared_products( lower(name) );
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sales_status ON sales(status);
```

4) Transaction guidance (create Sale + SaleItems)

Perform creation of a Sale and its SaleItems inside a single transaction. Compute line totals and sale total in the DB or application using exact decimals; persist only after validation succeeds.

Example transactional flow (psuedo-SQL using CTEs):

```sql
BEGIN;

-- 1) insert sale (total_amount can be 0 temporarily or computed beforehand)
INSERT INTO sales (id, customer_name, status, total_amount)
VALUES (gen_random_uuid(), 'Alice', 'prepared', 0)
RETURNING id INTO sale_id;

-- 2) compute and insert items (compute line_total = quantity * unit_price)
-- In client libraries compute precise totals and supply line_total, or use SQL expressions.

-- 3) compute sale total and update sale row atomically
UPDATE sales
SET total_amount = (SELECT COALESCE(SUM(line_total),0) FROM sale_items WHERE sale_id = sale_id)
WHERE id = sale_id;

COMMIT;
```

Backend should validate existence of referenced `prepared_product_id` before inserting items; prefer SELECT ... FOR KEY SHARE if concurrent deletes are possible.

5) Migration notes / backfill strategy (adding `total_amount` to an existing DB)

- If `sales.total_amount` will be added to an existing schema where sale_items already exist:
  1. Add the column as nullable first: `ALTER TABLE sales ADD COLUMN total_amount numeric(14,4);`
  2. Backfill in batches to avoid long locks (example using batch ids or created_at ranges):

```sql
-- compute totals per sale and write them
WITH sums AS (
  SELECT sale_id, SUM(line_total) AS total
  FROM sale_items
  GROUP BY sale_id
)
UPDATE sales s
SET total_amount = sums.total
FROM sums
WHERE s.id = sums.sale_id;
```

  3. For sales without items set `total_amount = 0`.
  4. Add NOT NULL constraint and CHECK after backfill and verification:

```sql
ALTER TABLE sales ALTER COLUMN total_amount SET NOT NULL;
ALTER TABLE sales ADD CONSTRAINT chk_sales_total_nonnegative CHECK (total_amount >= 0);
```

6) Data validation & consistency checks (use after migration/backfill)

```sql
-- detect mismatches between stored sale totals and recomputed totals
SELECT s.id, s.total_amount AS stored, COALESCE(sum(si.line_total),0) AS computed
FROM sales s
LEFT JOIN sale_items si ON si.sale_id = s.id
GROUP BY s.id, s.total_amount
HAVING s.total_amount IS DISTINCT FROM COALESCE(SUM(si.line_total),0);
```

7) Risks

-- Rounding/precision differences if client and DB use different scales; mitigate by standardizing on `numeric(12,4)` and computing totals in the DB when possible.
- Missing UUID extension (pgcrypto) on target DB; migration will fail unless extension is enabled.
- Long-running backfill operations may lock tables; perform backfill in small batches and during maintenance windows.
- Existing referential integrity violations in a live DB will block FK creation; run integrity checks before applying FKs.

8) Acceptance tests (suggested SQL checks for Backend Agent)

- Insert a sale + two items inside a transaction; assert sale.total_amount equals sum of inserted line_total.

```sql
BEGIN;
INSERT INTO sales (id, customer_name, status, total_amount) VALUES ('00000000-0000-0000-0000-000000000001','T1','prepared',0);
INSERT INTO sale_items (id, sale_id, prepared_product_id, quantity, unit_price, line_total) VALUES ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010', 2, 12.00, 24.00);
INSERT INTO sale_items (id, sale_id, prepared_product_id, quantity, unit_price, line_total) VALUES ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011', 1, 5.00, 5.00);
UPDATE sales SET total_amount = (SELECT SUM(line_total) FROM sale_items WHERE sale_id = '00000000-0000-0000-0000-000000000001') WHERE id = '00000000-0000-0000-0000-000000000001';
COMMIT;

-- verify
SELECT total_amount FROM sales WHERE id = '00000000-0000-0000-0000-000000000001'; -- expect 29.00
```

- FK validation: attempt to insert an expense with non-existent raw_product_id and expect failure (constraint violation).

```sql
-- should fail
INSERT INTO expenses (id, raw_product_id, quantity, unit_cost, purchased_at) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000099999', 1, 1000, now());
```

- Deletion semantics: try deleting a prepared_product referenced by a sale_item — expect failure because of ON DELETE RESTRICT.

9) Operational notes

- Use prepared statements or parameterized queries in the application to avoid SQL injection.
- Consider adding auditing columns or a soft-delete pattern in later phases; Phase 1 uses `ON DELETE RESTRICT` for historical integrity.

-- End of migration plan
