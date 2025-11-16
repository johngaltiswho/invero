-- Add vendor relationship to project_materials table
-- This stores which vendor was selected for the purchase request

ALTER TABLE project_materials 
ADD COLUMN vendor_id INTEGER REFERENCES vendors(id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_project_materials_vendor_id ON project_materials(vendor_id);

-- Add comment for clarity
COMMENT ON COLUMN project_materials.vendor_id IS 'Vendor selected for this material purchase request';