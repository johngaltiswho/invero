ALTER TABLE purchase_requests
  DROP CONSTRAINT IF EXISTS purchase_requests_delivery_status_check;

ALTER TABLE purchase_requests
  ADD CONSTRAINT purchase_requests_delivery_status_check
  CHECK (
    delivery_status IN (
      'not_dispatched',
      'dispatched',
      'backfill_pending_confirmation',
      'disputed',
      'delivered'
    )
  );

ALTER TABLE purchase_requests
  ADD COLUMN IF NOT EXISTS backfill_recorded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS backfill_recorded_by TEXT,
  ADD COLUMN IF NOT EXISTS backfill_reason TEXT;

COMMENT ON COLUMN purchase_requests.delivery_status IS
  'Delivery workflow status: not_dispatched, dispatched, backfill_pending_confirmation, disputed, delivered.';

COMMENT ON COLUMN purchase_requests.backfill_recorded_at IS
  'Timestamp when admin recorded a missed delivery and started contractor confirmation window.';

COMMENT ON COLUMN purchase_requests.backfill_recorded_by IS
  'Admin identifier that recorded the backfilled delivery.';

COMMENT ON COLUMN purchase_requests.backfill_reason IS
  'Reason or proof note entered by admin while backfilling a missed delivery update.';
