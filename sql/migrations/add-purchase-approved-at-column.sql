-- Add purchase_approved_at column to project_materials table

ALTER TABLE project_materials ADD COLUMN IF NOT EXISTS purchase_approved_at TIMESTAMP WITH TIME ZONE;

-- Add comment for the new column
COMMENT ON COLUMN project_materials.purchase_approved_at IS 'Timestamp when purchase request was approved by admin';