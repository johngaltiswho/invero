-- Rename project-level shipping address to project_address for consistency

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'shipping_address'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'project_address'
  ) THEN
    ALTER TABLE projects RENAME COLUMN shipping_address TO project_address;
  END IF;
END $$;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_address TEXT;

COMMENT ON COLUMN projects.project_address IS 'Primary project/site address';
