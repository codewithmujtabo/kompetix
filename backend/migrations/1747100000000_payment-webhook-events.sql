-- Idempotency log for Midtrans (and future Stripe) webhooks.
-- Midtrans retries on non-2xx; without this we double-process settlement / expire events.

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        TEXT NOT NULL DEFAULT 'midtrans',   -- 'midtrans' | 'stripe' (future)
  order_id        TEXT NOT NULL,                       -- Midtrans order_id
  signature_key   TEXT NOT NULL,                       -- Midtrans signature_key (used as dedup token)
  transaction_status TEXT,                             -- e.g. 'settlement', 'pending', 'expire', 'cancel'
  raw_payload     JSONB NOT NULL,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, order_id, signature_key)
);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_order_id  ON payment_webhook_events(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_received  ON payment_webhook_events(received_at DESC);
