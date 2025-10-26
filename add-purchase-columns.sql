-- Add purchase request columns to existing materials table
-- Run this script in your Supabase SQL editor

ALTER TABLE materials ADD COLUMN IF NOT EXISTS purchase_status VARCHAR DEFAULT 'none' CHECK (purchase_status IN (
    'none',                  -- Material approved but not yet requested for purchase
    'purchase_requested',    -- Contractor requested purchase with vendor
    'admin_review',          -- Under admin review
    'approved_for_purchase', -- Approved for procurement
    'vendor_contacted',      -- PDF sent to vendor
    'quote_received',        -- Quote uploaded by contractor
    'quote_under_review',    -- Quote under admin review
    'approved_for_funding',  -- Approved for fund disbursement
    'funds_disbursed',       -- Funds released
    'purchase_completed',    -- Purchase completed
    'rejected',              -- Purchase request rejected
    'cancelled'              -- Purchase request cancelled
));

ALTER TABLE materials ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES vendors(id);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS purchase_quantity DECIMAL(10,2);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS estimated_rate DECIMAL(10,2);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS quoted_rate DECIMAL(10,2);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS quoted_total DECIMAL(12,2);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS approved_amount DECIMAL(12,2);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS delivery_date DATE;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS contractor_notes TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS admin_purchase_notes TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS vendor_pdf_url TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS quote_file_url TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS purchase_requested_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS purchase_approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS purchase_completed_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_materials_purchase_status ON materials(purchase_status);
CREATE INDEX IF NOT EXISTS idx_materials_vendor_id ON materials(vendor_id);
CREATE INDEX IF NOT EXISTS idx_materials_approval_purchase ON materials(approval_status, purchase_status);