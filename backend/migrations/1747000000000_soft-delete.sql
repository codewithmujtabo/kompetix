-- Soft delete: add deleted_at to all PII-bearing tables so deletes are recoverable + auditable.
-- All read queries should filter WHERE deleted_at IS NULL (use softDeleteFilter helper).
-- Hard delete remains possible via the retention cron after the legal retention window.

ALTER TABLE users                    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE students                 ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE parents                  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE teachers                 ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE registrations            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE payments                 ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE documents                ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE historical_participants  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE notifications            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial indexes: most queries scan only "live" rows. Skip indexing the dead ones.
CREATE INDEX IF NOT EXISTS idx_users_live          ON users(id)                   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_registrations_live  ON registrations(user_id)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_live       ON payments(registration_id)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_live      ON documents(user_id)          WHERE deleted_at IS NULL;
