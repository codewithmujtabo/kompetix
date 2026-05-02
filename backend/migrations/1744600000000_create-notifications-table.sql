-- ============================================================================
-- Migration: Create notifications table
-- Sprint 3, Track B, Phase 1 (T6.1-T6.3)
-- ============================================================================

-- T6.1 — Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- T6.2 — Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Comment
COMMENT ON TABLE notifications IS 'In-app notification inbox for users';
COMMENT ON COLUMN notifications.type IS 'Notification type: registration_created, payment_success, deadline_reminder, etc.';
COMMENT ON COLUMN notifications.data IS 'Additional metadata for deep linking (compId, registrationId, etc.)';
COMMENT ON COLUMN notifications.read IS 'Whether user has read this notification';
