-- Migration: Parent-Student Linking System
-- Description: Creates tables for parent-student relationships with PIN-based verification
-- Sprint: 5 (S09-S10)

-- Junction table for parent-student relationships (many-to-many)
CREATE TABLE IF NOT EXISTS parent_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  UNIQUE(parent_id, student_id)
);

-- Indexes for performance
CREATE INDEX idx_parent_links_parent ON parent_student_links(parent_id) WHERE status = 'active';
CREATE INDEX idx_parent_links_student ON parent_student_links(student_id) WHERE status = 'pending';

-- Invitation system with PIN verification
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_email TEXT NOT NULL,
  verification_pin TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'expired')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ
);

-- Indexes for invitation lookups
CREATE INDEX idx_invitations_parent_email ON invitations(parent_email) WHERE status = 'pending';
CREATE INDEX idx_invitations_student ON invitations(student_id);
CREATE INDEX idx_invitations_status ON invitations(status, expires_at);

-- Comments for documentation
COMMENT ON TABLE parent_student_links IS 'Junction table linking parent and student accounts';
COMMENT ON TABLE invitations IS 'Temporary invitations with 6-digit PIN codes for parent verification';
COMMENT ON COLUMN invitations.verification_pin IS '6-digit PIN code for verification (100000-999999)';
COMMENT ON COLUMN invitations.expires_at IS 'PIN expires after 24 hours';
