-- Migration: add-scheduled-notifications
-- Sprint 4, Track C (T10, T11)
-- Adds support for scheduled/delayed notifications

-- Add scheduled_for column to notifications table
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

-- Add sent column to track if notification was sent
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS sent BOOLEAN NOT NULL DEFAULT TRUE;

-- Index for efficient cron queries
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_for)
WHERE sent = FALSE AND scheduled_for IS NOT NULL;

-- Comment
COMMENT ON COLUMN notifications.scheduled_for IS 'When to send this notification (NULL = send immediately)';
COMMENT ON COLUMN notifications.sent IS 'Whether push notification was sent (used for scheduled notifications)';
