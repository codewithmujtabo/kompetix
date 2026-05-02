-- Favorites + Payment Proof + Admin Approval System Migration
-- Created: 2026-04-24

-- 1. Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comp_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, comp_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_comp_id ON favorites(comp_id);

-- 2. Add payment proof columns to payments table
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS proof_submitted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_payments_proof ON payments(payment_proof_url)
  WHERE payment_proof_url IS NOT NULL;

-- 3. Add review tracking columns to registrations table
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);

-- 4. Update registration status constraint to include new statuses
ALTER TABLE registrations
  DROP CONSTRAINT IF EXISTS registrations_status_check;

ALTER TABLE registrations
  ADD CONSTRAINT registrations_status_check
  CHECK (status IN ('registered', 'pending_review', 'approved', 'rejected', 'paid', 'submitted', 'completed'));

-- 5. Add comment for documentation
COMMENT ON TABLE favorites IS 'Stores user-saved competitions (wishlist/favorites)';
COMMENT ON COLUMN payments.payment_proof_url IS 'URL to uploaded payment receipt/proof image';
COMMENT ON COLUMN registrations.reviewed_by IS 'Admin user ID who reviewed the registration';
COMMENT ON COLUMN registrations.rejection_reason IS 'Reason provided by admin when rejecting registration';
