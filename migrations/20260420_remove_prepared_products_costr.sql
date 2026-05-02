-- Migration: Remove cost_price column from prepared_products
-- Created: 2026-04-20

ALTER TABLE prepared_products
DROP COLUMN IF EXISTS cost_price;
