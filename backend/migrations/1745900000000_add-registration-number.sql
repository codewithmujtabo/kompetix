-- Migration: Add registration_number to registrations (KMP-2026-XXXXX format)

-- Sequence starts at 10001 so all numbers are always 5 digits
CREATE SEQUENCE IF NOT EXISTS registration_number_seq START WITH 10001;

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS registration_number TEXT UNIQUE
    DEFAULT 'KMP-2026-' || LPAD(nextval('registration_number_seq')::TEXT, 5, '0');
