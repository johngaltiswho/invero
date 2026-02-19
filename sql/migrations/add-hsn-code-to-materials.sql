-- Add HSN/SAC code support for invoicing
ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(16);

CREATE INDEX IF NOT EXISTS idx_materials_hsn_code ON materials(hsn_code);

COMMENT ON COLUMN materials.hsn_code IS 'HSN/SAC code used for GST-compliant invoicing';
