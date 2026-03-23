-- Add Phase 2 product fields: cost_price for prepared_products and supplier for raw_products
BEGIN;

-- Add nullable cost_price to prepared_products (numeric(12,4), default NULL)
ALTER TABLE prepared_products
  ADD COLUMN IF NOT EXISTS cost_price numeric(12,4);

-- Add supplier text to raw_products if missing
ALTER TABLE raw_products
  ADD COLUMN IF NOT EXISTS supplier text;

COMMIT;

-- NOTE: Do NOT create prepared_product_recipes table in this migration.
-- That table is optional and requires Architect confirmation before creation.
