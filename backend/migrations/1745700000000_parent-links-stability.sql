-- Parent link stability fixes
-- Fix cleanup function to use existing timestamps on invitations

CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
  UPDATE invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now() - INTERVAL '7 days';

  DELETE FROM invitations
  WHERE status = 'expired'
    AND COALESCE(accepted_at, created_at) < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
