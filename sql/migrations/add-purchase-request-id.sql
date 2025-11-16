-- Add purchase_request_id to project_materials for grouping batch submissions
-- This allows us to group materials submitted together as one purchase request

ALTER TABLE project_materials 
ADD COLUMN purchase_request_id UUID;

-- Add index for efficient querying by purchase request
CREATE INDEX IF NOT EXISTS idx_project_materials_purchase_request_id 
ON project_materials(purchase_request_id);

-- Add comment for clarity
COMMENT ON COLUMN project_materials.purchase_request_id IS 'Groups materials submitted together in one purchase request batch';