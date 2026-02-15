-- Add vendor assignment to purchase requests
ALTER TABLE purchase_requests
  ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vendor_assigned_at TIMESTAMPTZ;

-- Index for vendor lookups
CREATE INDEX IF NOT EXISTS idx_purchase_requests_vendor_id ON purchase_requests(vendor_id);
