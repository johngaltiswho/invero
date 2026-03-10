-- Add support for admin-generated Purchase Orders from purchase requests
-- This extends the existing purchase_orders table to support both:
-- 1. Contractor-initiated bulk orders (existing workflow)
-- 2. Admin-generated POs from approved purchase requests (new workflow)

-- Add new columns to support admin-generated POs
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS purchase_request_id UUID REFERENCES purchase_requests(id);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS po_number VARCHAR;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS po_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS po_url TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS generated_by UUID;

-- Update status check constraint to include 'generated' status for admin POs
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_status_check
  CHECK (status IN (
    'draft',                 -- Being created (contractor workflow)
    'requested',             -- Submitted to admin (contractor workflow)
    'admin_review',          -- Under admin review (contractor workflow)
    'approved_for_purchase', -- Admin approved (contractor workflow)
    'quote_received',        -- PI uploaded (contractor workflow)
    'approved_for_funding',  -- Admin approved funding (contractor workflow)
    'purchase_completed',    -- Order completed (contractor workflow)
    'rejected',              -- Admin rejected (both workflows)
    'cancelled',             -- Order cancelled (both workflows)
    'generated'              -- Admin-generated PO (admin workflow)
  ));

-- Create sequence for PO numbers
CREATE SEQUENCE IF NOT EXISTS po_number_seq START 1;

-- Create function to generate PO numbers (PO-YYYY-NNNNN format)
CREATE OR REPLACE FUNCTION next_po_number()
RETURNS VARCHAR AS $$
DECLARE
  current_year VARCHAR;
  next_num INTEGER;
  po_num VARCHAR;
BEGIN
  current_year := TO_CHAR(NOW(), 'YYYY');
  next_num := nextval('po_number_seq');
  po_num := 'PO-' || current_year || '-' || LPAD(next_num::TEXT, 5, '0');
  RETURN po_num;
END;
$$ LANGUAGE plpgsql;

-- Add index for purchase_request_id lookups
CREATE INDEX IF NOT EXISTS idx_purchase_orders_purchase_request ON purchase_orders(purchase_request_id);

-- Add index for po_number lookups
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_number ON purchase_orders(po_number);

-- Add comment to clarify the dual-purpose table
COMMENT ON TABLE purchase_orders IS 'Stores both contractor-initiated bulk orders and admin-generated POs from purchase requests';
COMMENT ON COLUMN purchase_orders.purchase_request_id IS 'Links to purchase_request for admin-generated POs (NULL for contractor bulk orders)';
COMMENT ON COLUMN purchase_orders.po_number IS 'Admin PO number in format PO-YYYY-NNNNN (NULL for contractor bulk orders)';
COMMENT ON COLUMN purchase_orders.order_number IS 'Contractor bulk order number in format PR-NNN (NULL for admin POs)';
