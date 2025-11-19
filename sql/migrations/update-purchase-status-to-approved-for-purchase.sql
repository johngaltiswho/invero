-- Update purchase status constraint to use approved_for_purchase instead of approved_for_funding

-- First check what values currently exist
-- SELECT DISTINCT purchase_status FROM project_materials WHERE purchase_status IS NOT NULL;

-- Drop the existing constraint first
ALTER TABLE project_materials DROP CONSTRAINT IF EXISTS project_materials_purchase_status_check;

-- Update existing records to match new constraint
UPDATE project_materials 
SET purchase_status = 'approved_for_purchase' 
WHERE purchase_status = 'approved_for_funding';

UPDATE project_materials 
SET purchase_status = 'purchase_request_raised' 
WHERE purchase_status = 'purchase_requested';

UPDATE project_materials 
SET purchase_status = 'purchase_request_raised' 
WHERE purchase_status = 'finverno_submitted';

UPDATE project_materials 
SET purchase_status = 'purchase_request_raised' 
WHERE purchase_status = 'quote_received';

-- Handle any NULL values
UPDATE project_materials 
SET purchase_status = 'pending' 
WHERE purchase_status IS NULL;

-- Add new constraint with approved_for_purchase (keeping 'none' for backwards compatibility)
ALTER TABLE project_materials ADD CONSTRAINT project_materials_purchase_status_check CHECK (purchase_status IN (
    'pending',                   -- Material ready for purchase request  
    'none',                      -- Default/no purchase request yet (backwards compatibility)
    'purchase_request_raised',   -- Submitted for admin approval
    'approved_for_purchase',     -- Approved by admin for procurement
    'completed',                 -- Purchase completed
    'rejected'                   -- Request rejected
));

-- Update comment
COMMENT ON COLUMN project_materials.purchase_status IS 'Purchase workflow: pending -> purchase_request_raised -> approved_for_purchase -> completed';

-- Update index if needed
DROP INDEX IF EXISTS idx_project_materials_purchase_status;
CREATE INDEX idx_project_materials_purchase_status ON project_materials(purchase_status) WHERE purchase_status IN ('purchase_request_raised', 'approved_for_purchase');