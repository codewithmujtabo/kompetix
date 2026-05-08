-- Person-KID: every user gets a stable, immutable identifier independent of email/phone.
-- Format: KX-YYYY-NNNNNNN (KX = Kompetzy/Competzy, year-stamped, 7-digit zero-padded sequence).
-- Spec PRD §F-ID-02. Distinct from CTZ-YYYY-NNNNN (registration_number, per registration row).

CREATE SEQUENCE IF NOT EXISTS person_kid_seq START WITH 0000001;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS kid TEXT
    DEFAULT 'KX-2026-' || LPAD(nextval('person_kid_seq')::TEXT, 7, '0');

-- Backfill existing rows (DEFAULT only fires on new INSERTs).
-- We process by created_at ASC so older accounts get smaller numbers.
UPDATE users
   SET kid = 'KX-2026-' || LPAD(nextval('person_kid_seq')::TEXT, 7, '0')
 WHERE kid IS NULL;

ALTER TABLE users
  ALTER COLUMN kid SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_kid ON users(kid);
