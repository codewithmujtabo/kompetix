-- Spec F-SP-01 prerequisite: schools must self-sign-up and be verified by an admin
-- before they get access to the school portal (Bulk Registration, Bulk Payment, Reports).
-- Existing rows are marked 'verified' so seeded schools keep working.

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS verification_status      TEXT NOT NULL DEFAULT 'verified'
    CHECK (verification_status IN ('pending_verification', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS verification_letter_url  TEXT,
  ADD COLUMN IF NOT EXISTS applied_by_user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS applied_at               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by_user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason         TEXT;

CREATE INDEX IF NOT EXISTS idx_schools_verification_status
  ON schools(verification_status)
  WHERE verification_status <> 'verified';
