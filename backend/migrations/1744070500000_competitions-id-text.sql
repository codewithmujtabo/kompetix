-- Migration: competitions-id-text
-- Change competitions.id from UUID to TEXT so we can use readable slugs
-- (e.g. "comp-001"). The registrations table already stores comp_id as TEXT.

ALTER TABLE competitions ALTER COLUMN id SET DATA TYPE TEXT;
