-- Add tendering workflow fields to projects table
-- Phase 1: Essential tendering functionality without version control

-- 1. Add tender-specific fields to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tender_submission_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tender_status VARCHAR DEFAULT 'draft';

-- 2. Add constraint for tender_status values
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_tender_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_tender_status_check 
    CHECK (tender_status IN ('draft', 'submitted', 'awarded', 'lost', 'cancelled'));

-- 3. Add index for tender status filtering (important for performance)
CREATE INDEX IF NOT EXISTS idx_projects_tender_status ON projects(tender_status);

-- 4. Enhance boq_items table for better quote line item management
ALTER TABLE boq_items ADD COLUMN IF NOT EXISTS line_order INTEGER DEFAULT 0;
ALTER TABLE boq_items ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE boq_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. Add index for line item ordering
CREATE INDEX IF NOT EXISTS idx_boq_items_order ON boq_items(boq_id, line_order);

-- 6. Add trigger for updated_at column on boq_items
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Only create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_boq_items_updated_at ON boq_items;
CREATE TRIGGER update_boq_items_updated_at 
    BEFORE UPDATE ON boq_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Set default values for existing records
UPDATE projects SET tender_status = 'draft' WHERE tender_status IS NULL AND project_status = 'draft';
UPDATE projects SET tender_status = 'awarded' WHERE tender_status IS NULL AND project_status IN ('awarded', 'finalized');

-- 8. Update line_order for existing boq_items (optional - for better ordering)
UPDATE boq_items SET line_order = 
    (SELECT ROW_NUMBER() OVER (PARTITION BY boq_id ORDER BY id) * 10)
WHERE line_order = 0;

COMMENT ON COLUMN projects.tender_submission_date IS 'Date when tender/proposal must be submitted to client';
COMMENT ON COLUMN projects.tender_status IS 'Current status of tender: draft, submitted, awarded, lost, cancelled';
COMMENT ON COLUMN boq_items.line_order IS 'Display order of line items in quote (allows reordering)';
COMMENT ON COLUMN boq_items.notes IS 'Additional notes for this line item';
COMMENT ON COLUMN boq_items.updated_at IS 'Last modification timestamp for audit trail';