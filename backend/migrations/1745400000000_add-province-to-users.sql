-- Add province column to users table for better location tracking
-- This helps with regional filtering and analytics

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS province TEXT;

-- Add index for province lookups
CREATE INDEX IF NOT EXISTS idx_users_province ON users(province);
