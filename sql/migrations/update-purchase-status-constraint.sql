-- Update purchase status constraint to use new nomenclature
-- Replace 'finverno_submitted' with 'purchase_request_raised'

-- Drop existing constraint
ALTER TABLE project_materials DROP CONSTRAINT IF EXISTS project_materials_purchase_status_check;

-- Add updated constraint with new nomenclature
ALTER TABLE project_materials ADD CONSTRAINT project_materials_purchase_status_check CHECK (purchase_status IN (
    'none',                      -- Material ready for purchase request
    'purchase_requested',        -- Standard vendor purchase requested (RFQ workflow)
    'quote_received',            -- Vendor quote received (for standard workflow)
    'purchase_request_raised',   -- Submitted for funding approval (previously 'finverno_submitted')
    'approved_for_funding',      -- Admin approved for fund disbursement
    'completed',                 -- Purchase completed successfully
    'rejected'                   -- Request rejected by admin
));

-- Update comment
COMMENT ON COLUMN project_materials.purchase_status IS 'Purchase workflow: none -> purchase_requested/purchase_request_raised -> approved_for_funding -> completed';

-- Update index to use new status name
DROP INDEX IF EXISTS idx_project_materials_purchase_status;
CREATE INDEX idx_project_materials_purchase_status ON project_materials(purchase_status) WHERE purchase_status IN ('purchase_request_raised', 'approved_for_funding');