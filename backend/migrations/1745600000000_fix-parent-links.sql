-- Migration: Fix Parent-Child Link System
-- Date: 2026-04-27
-- Description: Add constraints and indexes to improve parent-child linking system

-- Add unique constraint to prevent PIN collisions within the same student
-- Only applies to pending invitations to avoid conflicts with expired ones
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_pin_student
  ON invitations(student_id, verification_pin)
  WHERE status = 'pending';

-- Add composite index for performance on parent-student links
CREATE INDEX IF NOT EXISTS idx_parent_links_composite
  ON parent_student_links(parent_id, student_id, status);

-- Add index for faster invitation lookups (email + pin lookup)
CREATE INDEX IF NOT EXISTS idx_invitations_email_pin
  ON invitations(parent_email, verification_pin)
  WHERE status = 'pending';

-- Add function to cleanup expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
  -- Mark invitations as expired if they're past expiration + 7 days grace period
  UPDATE invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now() - INTERVAL '7 days';

  -- Delete old expired invitations (older than 30 days)
  DELETE FROM invitations
  WHERE status = 'expired'
    AND updated_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Add helpful comment for cron job setup
COMMENT ON FUNCTION cleanup_expired_invitations() IS
  'Clean up expired invitations. Should be called periodically from a cron job or scheduler.
   Example: SELECT cleanup_expired_invitations(); -- Run daily';
