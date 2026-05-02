-- Migration: add-consent-to-users
-- Adds UU PDP consent tracking to users table (T14)
-- consent_accepted_at: when the user agreed to the privacy policy
-- consent_version: which version of the policy was shown (for audit trail)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS consent_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consent_version TEXT;
