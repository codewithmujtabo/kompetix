-- Migration: Rebrand registration_number prefix from KMP-2026-XXXXX (Kompetix) to CTZ-2026-XXXXX (Competzy).
-- Existing rows keep their KMP-* numbers; only new rows pick up the new default.

ALTER TABLE registrations
  ALTER COLUMN registration_number
  SET DEFAULT 'CTZ-2026-' || LPAD(nextval('registration_number_seq')::TEXT, 5, '0');
