-- Migration: phone-identifier
-- Adds phone_verified_at to users and a partial unique index on phone.
-- Cleans duplicate phone entries in existing data before enforcing uniqueness.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

-- Null out duplicate phones — keep the earliest created row, clear the rest
UPDATE users u
SET phone = NULL
WHERE phone IS NOT NULL
  AND id NOT IN (
    SELECT DISTINCT ON (phone) id
    FROM users
    WHERE phone IS NOT NULL
    ORDER BY phone, created_at ASC
  );

-- Partial unique index: allows multiple NULL phones, enforces uniqueness for non-null
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique
  ON users(phone) WHERE phone IS NOT NULL;
