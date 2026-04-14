-- Clean-up database script: truncate all tables
-- This script removes all data from all tables while preserving the schema
-- Foreign key constraints are preserved; tables are truncated in dependency order

BEGIN;

-- Truncate tables in reverse dependency order
TRUNCATE TABLE sale_items CASCADE;
TRUNCATE TABLE sales CASCADE;
TRUNCATE TABLE expenses CASCADE;
TRUNCATE TABLE customers CASCADE;
TRUNCATE TABLE prepared_products CASCADE;
TRUNCATE TABLE raw_products CASCADE;

COMMIT;
