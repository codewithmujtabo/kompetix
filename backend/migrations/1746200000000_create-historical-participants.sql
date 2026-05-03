-- Migration: Historical participants table for past competition records
-- Source: Eduversal_Database.xlsx — 63,365 student-competition records

CREATE TABLE IF NOT EXISTS historical_participants (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id     TEXT    UNIQUE NOT NULL,    -- original STU0001 ID — dedup key for re-imports
  full_name     TEXT    NOT NULL,
  email         TEXT,                       -- 88.6% coverage
  phone         TEXT,                       -- E.164 (+62...), 96.9% coverage via whatsapp field
  grade         TEXT,
  gender        TEXT,
  payment_status TEXT,                      -- PAID | UNPAID
  result        TEXT,                       -- PASSED | FAILED | null
  school_name   TEXT,
  school_npsn   TEXT,
  comp_id       TEXT,                       -- original CMP001 etc.
  comp_name     TEXT,                       -- e.g. EMC, ISPO
  comp_year     TEXT,
  comp_category TEXT,
  event_part    TEXT,                       -- Individual | Team
  claimed_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  claimed_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Fast lookup for auto-linking at login
CREATE INDEX IF NOT EXISTS idx_historical_email
  ON historical_participants(email)
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_historical_phone
  ON historical_participants(phone)
  WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_historical_claimed_by
  ON historical_participants(claimed_by)
  WHERE claimed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_historical_comp_id
  ON historical_participants(comp_id);

-- Full-text search support for manual claim lookup (name + school)
CREATE INDEX IF NOT EXISTS idx_historical_name_gin
  ON historical_participants USING gin(to_tsvector('simple', full_name));
