-- Phase 12: indexes supporting the new report aggregates and list sorting.

-- Clear any transaction left aborted by a previous failed attempt on this
-- session (e.g. run against the wrong DB) before starting fresh. No-op
-- (just a notice, not an error) when there is nothing to roll back.
ROLLBACK;

BEGIN;

-- paid-only monthly aggregation + status-filtered sales list ordered by date
CREATE INDEX IF NOT EXISTS idx_sales_status_created_at
  ON sales(status, created_at DESC);

-- expenses default ordering / date sort (no index existed for this column)
CREATE INDEX IF NOT EXISTS idx_expenses_purchased_at
  ON expenses(purchased_at DESC);

-- case-insensitive name sorting for customers (existing index is not lower())
CREATE INDEX IF NOT EXISTS idx_customers_name_lower
  ON customers(lower(name));

-- default created_at DESC ordering for the remaining list endpoints
CREATE INDEX IF NOT EXISTS idx_raw_products_created_at
  ON raw_products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prepared_products_created_at
  ON prepared_products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_created_at
  ON customers(created_at DESC);

COMMIT;
