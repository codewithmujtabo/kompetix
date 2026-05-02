-- Sprint 2: add snap_token and order_id columns to payments
-- snap_token: the Midtrans Snap token returned by createTransaction
-- order_id:   the Midtrans order_id we send (used for webhook lookup)
-- payment_id: repurposed to store the Midtrans transaction_id from webhook

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS snap_token TEXT,
  ADD COLUMN IF NOT EXISTS order_id   TEXT;

-- Migrate data: payment_id currently stores the snap token from Sprint 1
UPDATE payments
  SET snap_token = payment_id
  WHERE snap_token IS NULL AND payment_id IS NOT NULL;

-- Index for fast webhook lookup
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
