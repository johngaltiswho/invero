ALTER TABLE fuel_pumps
  ADD COLUMN IF NOT EXISTS dashboard_access_code_hash TEXT,
  ADD COLUMN IF NOT EXISTS dashboard_access_label VARCHAR(64),
  ADD COLUMN IF NOT EXISTS dashboard_access_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dashboard_access_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_fuel_pumps_dashboard_access_active
  ON fuel_pumps(dashboard_access_active)
  WHERE dashboard_access_active = true;

COMMENT ON COLUMN fuel_pumps.dashboard_access_code_hash IS 'Hashed static dashboard access code for the pump-facing provider portal.';
COMMENT ON COLUMN fuel_pumps.dashboard_access_label IS 'Admin-visible label for the current pump dashboard access code.';
COMMENT ON COLUMN fuel_pumps.dashboard_access_active IS 'Whether pump dashboard access is enabled for this pump.';
COMMENT ON COLUMN fuel_pumps.dashboard_access_version IS 'Monotonic version used to invalidate old dashboard sessions after code reset.';
COMMENT ON COLUMN fuel_pumps.last_accessed_at IS 'Timestamp of the last successful provider dashboard access for this pump.';
