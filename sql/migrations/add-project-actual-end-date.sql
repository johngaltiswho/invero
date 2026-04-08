ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS actual_end_date TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN projects.actual_end_date IS
  'Actual project completion timestamp, set when the contractor explicitly marks the project as completed.';
