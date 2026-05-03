-- Migration: Add profile_snapshot JSONB column to registrations
-- Stores a point-in-time copy of the student's profile at registration time

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS profile_snapshot JSONB;
