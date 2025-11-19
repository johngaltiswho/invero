-- Add missing columns to project_materials table for purchase request approval

-- Add admin_notes column
ALTER TABLE project_materials ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add purchase_approved_at column
ALTER TABLE project_materials ADD COLUMN IF NOT EXISTS purchase_approved_at TIMESTAMP WITH TIME ZONE;

-- Add comments for the new columns
COMMENT ON COLUMN project_materials.admin_notes IS 'Admin notes for purchase request approval/rejection decisions';
COMMENT ON COLUMN project_materials.purchase_approved_at IS 'Timestamp when purchase request was approved by admin';