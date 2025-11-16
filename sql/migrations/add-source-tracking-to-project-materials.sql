-- Add source tracking to project_materials table
-- This allows materials to link back to their original source (drawing, BOQ, etc.)

ALTER TABLE project_materials ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'manual' 
  CHECK (source_type IN ('manual', 'drawing_takeoff', 'boq_analysis', 'schedule_analysis'));

ALTER TABLE project_materials ADD COLUMN IF NOT EXISTS source_file_name VARCHAR(255);
ALTER TABLE project_materials ADD COLUMN IF NOT EXISTS source_file_url TEXT;
ALTER TABLE project_materials ADD COLUMN IF NOT EXISTS source_takeoff_id INTEGER;

-- Add index for source lookups
CREATE INDEX IF NOT EXISTS idx_project_materials_source_type ON project_materials(source_type);
CREATE INDEX IF NOT EXISTS idx_project_materials_source_takeoff ON project_materials(source_takeoff_id);

-- Add comments
COMMENT ON COLUMN project_materials.source_type IS 'Type of source: manual, drawing_takeoff, boq_analysis, schedule_analysis';
COMMENT ON COLUMN project_materials.source_file_name IS 'Name of source file (e.g., "Floor Plan.pdf")';
COMMENT ON COLUMN project_materials.source_file_url IS 'URL to source file for quick access';
COMMENT ON COLUMN project_materials.source_takeoff_id IS 'Reference to original takeoff item ID for traceability';