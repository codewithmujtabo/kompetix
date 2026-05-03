-- Migration: Add organizer role, organizers table, and created_by to competitions

-- 1. Expand role constraint on users to include 'organizer'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('student', 'parent', 'teacher', 'school_admin', 'admin', 'organizer'));

-- 2. Create organizers profile table
CREATE TABLE IF NOT EXISTS organizers (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  org_name TEXT NOT NULL DEFAULT '',
  bio TEXT DEFAULT '',
  website TEXT DEFAULT '',
  logo_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizers_verified ON organizers(verified);

-- 3. Add created_by column to competitions (links competition to its organizer user)
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_competitions_created_by ON competitions(created_by);
