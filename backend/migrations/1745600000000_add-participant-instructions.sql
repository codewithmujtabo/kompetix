-- Add participant instructions for approved/joined competition details
ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS participant_instructions TEXT;
