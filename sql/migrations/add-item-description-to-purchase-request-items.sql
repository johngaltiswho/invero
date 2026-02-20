-- Add per-line description/specification to purchase request items
ALTER TABLE purchase_request_items
  ADD COLUMN IF NOT EXISTS item_description TEXT;

COMMENT ON COLUMN purchase_request_items.item_description IS
  'Optional contractor-specified item description/specification carried into approvals and invoices';
