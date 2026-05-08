-- Spec F-PY-03 + F-ID-09: payment attribution.
-- The "payer" can differ from the registrant (parent pays for child, sponsor for student, school for staff).
-- Receipt is issued in payer's name; without this column we couldn't satisfy parent-reimbursement use cases.

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payer_kind    TEXT;     -- 'self' | 'parent' | 'school' | 'sponsor'

CREATE INDEX IF NOT EXISTS idx_payments_payer ON payments(payer_user_id);

-- Backfill: existing rows had no parent payer concept. Treat them as 'self'.
UPDATE payments
   SET payer_user_id = user_id, payer_kind = 'self'
 WHERE payer_user_id IS NULL;
