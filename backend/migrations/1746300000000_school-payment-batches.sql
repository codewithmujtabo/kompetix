-- Migration: School Payment Batches
-- Description: Allows school admins to pay for multiple student registrations in one batch
-- Sprint: 7 (T23)

CREATE TABLE IF NOT EXISTS school_payment_batches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  created_by   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  total_amount INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
  snap_token   TEXT,
  snap_redirect_url TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_school_payment_batches_school ON school_payment_batches(school_id);
CREATE INDEX idx_school_payment_batches_created_by ON school_payment_batches(created_by);

-- Link individual registrations to a batch
CREATE TABLE IF NOT EXISTS school_payment_batch_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id       UUID NOT NULL REFERENCES school_payment_batches(id) ON DELETE CASCADE,
  registration_id TEXT NOT NULL REFERENCES registrations(id) ON DELETE RESTRICT,
  amount         INTEGER NOT NULL,
  UNIQUE (batch_id, registration_id)
);

CREATE INDEX idx_batch_items_batch ON school_payment_batch_items(batch_id);
CREATE INDEX idx_batch_items_registration ON school_payment_batch_items(registration_id);
