ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_project_status_check;

ALTER TABLE projects
  ADD CONSTRAINT projects_project_status_check
  CHECK (project_status IN ('draft', 'awarded', 'finalized', 'completed'));

COMMENT ON COLUMN projects.project_status IS
  'Project workflow status: draft, awarded, finalized, or explicitly completed.';
