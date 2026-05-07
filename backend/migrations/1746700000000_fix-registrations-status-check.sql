-- The registrations_status_check constraint was missing 'pending_approval'
-- (used when a new registration is created) and 'pending_payment'
-- (used when a school batch payment is initiated).

ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_status_check;

ALTER TABLE registrations ADD CONSTRAINT registrations_status_check
  CHECK (status = ANY (ARRAY[
    'pending_approval',
    'pending_review',
    'pending_payment',
    'registered',
    'approved',
    'rejected',
    'paid',
    'submitted',
    'completed'
  ]));
