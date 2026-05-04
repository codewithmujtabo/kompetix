-- Migration: Add referral_code to registrations
-- Description: Capture referral code at registration time for Phase 3 referral/commission system
-- Sprint: 7 (T24)

ALTER TABLE registrations ADD COLUMN IF NOT EXISTS referral_code TEXT;

CREATE INDEX IF NOT EXISTS idx_registrations_referral_code
  ON registrations(referral_code)
  WHERE referral_code IS NOT NULL;
