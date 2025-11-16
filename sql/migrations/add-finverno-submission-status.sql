-- Optimized Finverno submission status workflow
-- Simplifies purchase status to essential states only

-- Drop the existing constraint and recreate it with simplified statuses
ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_purchase_status_check;

-- Simplified workflow: none -> purchase_requested -> finverno_submitted -> approved_for_funding -> completed
ALTER TABLE materials ADD CONSTRAINT materials_purchase_status_check CHECK (purchase_status IN (
    'none',                  -- Material ready for purchase request
    'purchase_requested',    -- Standard vendor purchase requested (RFQ workflow)
    'quote_received',        -- Vendor quote received (for standard workflow)
    'finverno_submitted',    -- Submitted to Finverno for funding approval
    'approved_for_funding',  -- Admin approved for fund disbursement
    'completed',             -- Purchase completed successfully
    'rejected'               -- Request rejected by admin
));

-- Add new columns for purchase workflow details
ALTER TABLE project_materials ADD COLUMN IF NOT EXISTS purchase_status VARCHAR DEFAULT 'none';
ALTER TABLE project_materials ADD COLUMN IF NOT EXISTS quoted_rate DECIMAL(10,2);
ALTER TABLE project_materials ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE project_materials ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2);
ALTER TABLE project_materials ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2);
ALTER TABLE project_materials ADD COLUMN IF NOT EXISTS purchase_invoice_url TEXT;
ALTER TABLE project_materials ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;

-- Add purchase status constraint to project_materials
ALTER TABLE project_materials ADD CONSTRAINT project_materials_purchase_status_check CHECK (purchase_status IN (
    'none',                  -- Material ready for purchase request
    'purchase_requested',    -- Standard vendor purchase requested (RFQ workflow)
    'quote_received',        -- Vendor quote received (for standard workflow)
    'finverno_submitted',    -- Submitted to Finverno for funding approval
    'approved_for_funding',  -- Admin approved for fund disbursement
    'completed',             -- Purchase completed successfully
    'rejected'               -- Request rejected by admin
));

-- Update workflow documentation
COMMENT ON COLUMN project_materials.purchase_status IS 'Purchase workflow: none -> purchase_requested/finverno_submitted -> approved_for_funding -> completed';

-- Essential indexes only
CREATE INDEX IF NOT EXISTS idx_project_materials_purchase_status ON project_materials(purchase_status) WHERE purchase_status IN ('finverno_submitted', 'approved_for_funding');
CREATE INDEX IF NOT EXISTS idx_project_materials_submitted_at ON project_materials(submitted_at) WHERE submitted_at IS NOT NULL;

-- Simple constraint: Submissions must have valid data
ALTER TABLE project_materials DROP CONSTRAINT IF EXISTS check_purchase_data;
ALTER TABLE project_materials ADD CONSTRAINT check_purchase_data 
    CHECK (
        (purchase_status NOT IN ('finverno_submitted', 'purchase_requested')) OR 
        (quoted_rate IS NOT NULL AND quoted_rate > 0 AND total_amount IS NOT NULL)
    );