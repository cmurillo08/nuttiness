-- Phase 5 migration: create customers table and add customer_id to sales
BEGIN;

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL UNIQUE,
  phone varchar(20),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for name lookups
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- Add customer_id to sales table (nullable FK to preserve historical orders)
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NOT NULL;

-- Create index for customer_id lookups in sales
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);

-- Drop customer_name column from sales (customer_name is now derived from customers table via customer_id)
ALTER TABLE sales
  DROP COLUMN IF EXISTS customer_name;

COMMIT;
