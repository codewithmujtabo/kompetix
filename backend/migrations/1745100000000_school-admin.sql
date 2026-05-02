-- Migration: School Admin Role & School Management
-- Description: Creates schools table and adds school_id to users
-- Sprint: 5 (S12)

-- Schools master table
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npsn TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  province TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for school lookups
CREATE INDEX idx_schools_npsn ON schools(npsn);
CREATE INDEX idx_schools_city ON schools(city);
CREATE INDEX idx_schools_province ON schools(province);

-- Add school_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);

-- Index for school-based queries
CREATE INDEX idx_users_school ON users(school_id) WHERE school_id IS NOT NULL;

-- Update role constraint to include school_admin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('student', 'parent', 'teacher', 'school_admin'));

-- Add school_id to students table for backward compatibility
ALTER TABLE students ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);

-- Comments for documentation
COMMENT ON TABLE schools IS 'Master table for school information';
COMMENT ON COLUMN schools.npsn IS 'NPSN - Indonesian National School Principal Number (unique identifier)';
COMMENT ON COLUMN users.school_id IS 'Reference to school for students, teachers, and school admins';
