-- Add simple project_status for 2-stage workflow
-- BOQ & Quoting (draft) → Awarded Projects (awarded/finalized)

-- 1. Add project_status column
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_status VARCHAR DEFAULT 'draft' 
    CHECK (project_status IN ('draft', 'awarded', 'finalized'));

-- 2. Set all existing projects to 'finalized' (they already have POs)
UPDATE projects SET project_status = 'finalized' WHERE project_status IS NULL;

-- 3. Add index for filtering
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(project_status);

COMMENT ON COLUMN projects.project_status IS '2-stage workflow: draft (BOQ & quoting) → awarded/finalized (active projects)';