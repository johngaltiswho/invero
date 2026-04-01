ALTER TABLE projects
  ALTER COLUMN estimated_value TYPE DECIMAL(15,2)
  USING COALESCE(estimated_value, 0)::DECIMAL(15,2),
  ALTER COLUMN funding_required TYPE DECIMAL(15,2)
  USING COALESCE(funding_required, 0)::DECIMAL(15,2);

COMMENT ON COLUMN projects.estimated_value IS 'Baseline project value in INR, stored with paise precision.';
COMMENT ON COLUMN projects.funding_required IS 'Requested funding amount in INR, stored with paise precision.';
