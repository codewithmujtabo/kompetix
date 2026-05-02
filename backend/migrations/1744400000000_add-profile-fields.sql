-- Sprint 2: Enhanced profile fields for students

-- Add student personal details
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS interests TEXT,
  ADD COLUMN IF NOT EXISTS referral_source TEXT,
  ADD COLUMN IF NOT EXISTS student_card_url TEXT;

-- Rename 'school' to 'school_name' for consistency (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'school'
  ) THEN
    ALTER TABLE students RENAME COLUMN school TO school_name;
  END IF;
END $$;

-- Ensure school_name exists (in case migration runs on fresh DB)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS school_name TEXT;

-- Add school details
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS npsn TEXT,
  ADD COLUMN IF NOT EXISTS school_address TEXT,
  ADD COLUMN IF NOT EXISTS school_email TEXT,
  ADD COLUMN IF NOT EXISTS school_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS school_phone TEXT;

-- Add supervisor details
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS supervisor_name TEXT,
  ADD COLUMN IF NOT EXISTS supervisor_email TEXT,
  ADD COLUMN IF NOT EXISTS supervisor_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS supervisor_phone TEXT,
  ADD COLUMN IF NOT EXISTS supervisor_school_id TEXT,
  ADD COLUMN IF NOT EXISTS supervisor_linked BOOLEAN DEFAULT false;

-- Add parent details
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS parent_name TEXT,
  ADD COLUMN IF NOT EXISTS parent_occupation TEXT,
  ADD COLUMN IF NOT EXISTS parent_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS parent_phone TEXT,
  ADD COLUMN IF NOT EXISTS parent_school_id TEXT,
  ADD COLUMN IF NOT EXISTS parent_linked BOOLEAN DEFAULT false;

-- Add index for NPSN lookups
CREATE INDEX IF NOT EXISTS idx_students_npsn ON students(npsn);
