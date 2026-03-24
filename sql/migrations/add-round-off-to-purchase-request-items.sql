ALTER TABLE purchase_request_items
  ADD COLUMN IF NOT EXISTS round_off_amount DECIMAL(10, 2) DEFAULT 0;

UPDATE purchase_request_items
SET round_off_amount = 0
WHERE round_off_amount IS NULL;

COMMENT ON COLUMN purchase_request_items.round_off_amount IS 'Manual post-tax round-off adjustment applied to the line total';
