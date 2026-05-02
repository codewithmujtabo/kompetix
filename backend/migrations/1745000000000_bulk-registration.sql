-- Migration: Bulk Registration System
-- Description: Creates job tracking table for CSV bulk uploads and adds NISN field
-- Sprint: 5 (S11)

-- Job tracking table for bulk registration uploads
CREATE TABLE IF NOT EXISTS bulk_registration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  total_rows INTEGER NOT NULL,
  processed_rows INTEGER DEFAULT 0,
  successful_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  errors JSONB DEFAULT '[]'::jsonb,
  csv_data JSONB,  -- Store parsed CSV rows for processing
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Indexes for job lookups
CREATE INDEX idx_bulk_jobs_uploaded_by ON bulk_registration_jobs(uploaded_by);
CREATE INDEX idx_bulk_jobs_status ON bulk_registration_jobs(status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_bulk_jobs_created ON bulk_registration_jobs(created_at DESC);

-- Add NISN field to students table for verification
ALTER TABLE students ADD COLUMN IF NOT EXISTS nisn TEXT;

-- Create unique index on NISN (allows NULL values)
CREATE UNIQUE INDEX idx_students_nisn ON students(nisn) WHERE nisn IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE bulk_registration_jobs IS 'Tracks CSV bulk registration upload jobs';
COMMENT ON COLUMN bulk_registration_jobs.csv_data IS 'Parsed CSV rows stored as JSON for background processing';
COMMENT ON COLUMN bulk_registration_jobs.errors IS 'Array of {row: number, error: string} objects';
COMMENT ON COLUMN students.nisn IS 'NISN - Indonesian student identification number (10 digits)';
