-- Phase 12: expenses.quantity and sale_items.quantity become integers.

-- Clear any transaction left aborted by a previous failed attempt on this
-- session (e.g. run against the wrong DB) before starting fresh. No-op
-- (just a notice, not an error) when there is nothing to roll back.
ROLLBACK;

BEGIN;

-- 1) Safety gate: refuse to convert if fractional data exists.
DO $$
DECLARE
  bad_expenses bigint;
  bad_sale_items bigint;
BEGIN
  SELECT COUNT(*) INTO bad_expenses   FROM expenses   WHERE quantity <> trunc(quantity);
  SELECT COUNT(*) INTO bad_sale_items FROM sale_items WHERE quantity <> trunc(quantity);

  IF bad_expenses > 0 OR bad_sale_items > 0 THEN
    RAISE EXCEPTION
      'Fractional quantities found (expenses: %, sale_items: %). Resolve them manually before running this migration.',
      bad_expenses, bad_sale_items;
  END IF;
END $$;

-- 2) expenses.quantity -> integer (no-op when already converted)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'quantity' AND data_type <> 'integer'
  ) THEN
    ALTER TABLE expenses ALTER COLUMN quantity TYPE integer USING quantity::integer;
  END IF;
END $$;

-- 3) sale_items.quantity -> integer (no-op when already converted)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sale_items' AND column_name = 'quantity' AND data_type <> 'integer'
  ) THEN
    ALTER TABLE sale_items ALTER COLUMN quantity TYPE integer USING quantity::integer;
  END IF;
END $$;

COMMIT;
