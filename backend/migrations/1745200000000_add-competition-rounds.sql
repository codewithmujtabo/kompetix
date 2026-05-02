-- Migration: Add competition rounds support
-- Adds support for multi-round competitions with different dates, fees, and formats

-- Add new fields to competitions table
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS registration_status TEXT CHECK (registration_status IN ('On Going', 'Closed', 'Coming Soon'));
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS poster_url TEXT;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS is_international BOOLEAN DEFAULT false;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS detailed_description TEXT;

-- Create competition_rounds table for multi-round competitions
CREATE TABLE IF NOT EXISTS competition_rounds (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  comp_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  round_name TEXT NOT NULL,
  round_type TEXT CHECK (round_type IN ('Online', 'On-site', 'Hybrid')),
  start_date TIMESTAMPTZ,
  registration_deadline TIMESTAMPTZ,
  exam_date TIMESTAMPTZ,
  results_date TIMESTAMPTZ,
  fee INTEGER DEFAULT 0,
  location TEXT,
  round_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competition_rounds_comp_id ON competition_rounds(comp_id);
CREATE INDEX IF NOT EXISTS idx_competition_rounds_order ON competition_rounds(comp_id, round_order);

-- Add round_count to competitions for quick reference
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS round_count INTEGER DEFAULT 1;
