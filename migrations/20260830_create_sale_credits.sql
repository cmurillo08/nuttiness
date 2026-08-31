-- Phase 13: partial payments (credits) recorded against a sale.

-- Clear any transaction left aborted by a previous failed attempt on this
-- session (e.g. run against the wrong DB) before starting fresh. No-op
-- (just a notice, not an error) when there is nothing to roll back.
ROLLBACK;

BEGIN;

CREATE TABLE IF NOT EXISTS sale_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  notes text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  CONSTRAINT fk_sale_credit_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
);

-- every read is "all credits for one sale", ordered by payment date
CREATE INDEX IF NOT EXISTS idx_sale_credits_sale_id ON sale_credits(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_credits_sale_id_recorded_at
  ON sale_credits(sale_id, recorded_at);

COMMIT;
