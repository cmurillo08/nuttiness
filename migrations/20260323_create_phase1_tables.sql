-- Phase 1 migration: create tables with pgcrypto UUIDs and numeric(12,2)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Raw products (ingredients)
CREATE TABLE IF NOT EXISTS raw_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit text NOT NULL,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  supplier text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- Prepared products (catalog)
CREATE TABLE IF NOT EXISTS prepared_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  unit text NOT NULL,
  recipe_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- Expenses (purchase records of raw products)
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_product_id uuid NOT NULL,
  quantity numeric(12,2) NOT NULL CHECK (quantity > 0),
  cost numeric(12,2) NOT NULL CHECK (cost >= 0), -- renamed from unit_cost; cost is price per unit
  purchased_at timestamptz NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  CONSTRAINT fk_expense_raw_product FOREIGN KEY (raw_product_id) REFERENCES raw_products(id) ON DELETE RESTRICT
);

-- Sales (aggregate)
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text,
  status text NOT NULL CHECK (status IN ('ordered', 'prepared','delivered','paid','cancelled')),
  total_amount numeric(12,2) NOT NULL CHECK (total_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- Sale items (line items)
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL,
  prepared_product_id uuid NOT NULL,
  quantity numeric(12,2) NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  line_total numeric(12,2) NOT NULL CHECK (line_total >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  CONSTRAINT fk_saleitem_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  CONSTRAINT fk_saleitem_prepared_product FOREIGN KEY (prepared_product_id) REFERENCES prepared_products(id) ON DELETE RESTRICT
);

-- Index recommendations (apply as needed)
CREATE INDEX IF NOT EXISTS idx_expenses_raw_product_id ON expenses(raw_product_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_prepared_product_id ON sale_items(prepared_product_id);
CREATE INDEX IF NOT EXISTS idx_raw_products_name ON raw_products( lower(name) );
CREATE INDEX IF NOT EXISTS idx_prepared_products_name ON prepared_products( lower(name) );
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
