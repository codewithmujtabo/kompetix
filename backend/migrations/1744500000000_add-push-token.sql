-- Migration: Add push_token column to users table
-- Sprint 3, Track A, Task T2.1
-- Stores Expo Push Token for sending push notifications

-- Up migration
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Create index for faster lookups when sending notifications
CREATE INDEX IF NOT EXISTS idx_users_push_token ON users(push_token) WHERE push_token IS NOT NULL;

-- Down migration (commented, run manually if needed)
-- DROP INDEX IF EXISTS idx_users_push_token;
-- ALTER TABLE users DROP COLUMN IF EXISTS push_token;
