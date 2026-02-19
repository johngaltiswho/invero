-- Add HSN/SAC snapshot on purchase request items
ALTER TABLE purchase_request_items
  ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(16);

CREATE INDEX IF NOT EXISTS idx_purchase_request_items_hsn_code
  ON purchase_request_items(hsn_code);

COMMENT ON COLUMN purchase_request_items.hsn_code IS 'HSN/SAC code captured at purchase request item level for audit and invoicing';

-- Backfill from material master when possible
UPDATE purchase_request_items pri
SET hsn_code = m.hsn_code
FROM project_materials pm
JOIN materials m ON m.id = pm.material_id
WHERE pri.project_material_id = pm.id
  AND (pri.hsn_code IS NULL OR pri.hsn_code = '')
  AND m.hsn_code IS NOT NULL
  AND m.hsn_code <> '';
