-- Migration: Post-payment redirect token + VA expiry support

-- T9: Short-lived JWT stored after successful payment; consumed by mobile redirect button
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS redirect_token TEXT;

-- T9: Organizer can configure a URL to redirect students to after payment
ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS post_payment_redirect_url TEXT;
