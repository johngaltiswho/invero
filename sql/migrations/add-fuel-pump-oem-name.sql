ALTER TABLE fuel_pumps
  ADD COLUMN IF NOT EXISTS oem_name VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_fuel_pumps_oem_name
  ON fuel_pumps(oem_name)
  WHERE is_active = true AND oem_name IS NOT NULL;

COMMENT ON COLUMN fuel_pumps.oem_name IS 'Fuel OEM / network brand name used for partner grouping and future bulk commercial deals.';
