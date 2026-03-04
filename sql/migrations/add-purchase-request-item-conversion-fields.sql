-- Add conversion snapshot fields to purchase_request_items
-- Enables PR-time unit conversion (site unit -> procurement unit)
-- while preserving backward compatibility with requested_qty.

ALTER TABLE purchase_request_items
  ADD COLUMN IF NOT EXISTS site_unit VARCHAR(64),
  ADD COLUMN IF NOT EXISTS purchase_unit VARCHAR(64),
  ADD COLUMN IF NOT EXISTS conversion_factor DECIMAL(14,6),
  ADD COLUMN IF NOT EXISTS purchase_qty DECIMAL(14,3),
  ADD COLUMN IF NOT EXISTS normalized_qty DECIMAL(14,3);

COMMENT ON COLUMN purchase_request_items.site_unit IS 'Unit used by site/material requirement (e.g. m)';
COMMENT ON COLUMN purchase_request_items.purchase_unit IS 'Unit used for ordering/procurement (e.g. roll)';
COMMENT ON COLUMN purchase_request_items.conversion_factor IS 'How many site units are covered by 1 purchase unit';
COMMENT ON COLUMN purchase_request_items.purchase_qty IS 'Auto-computed procurement quantity (non-editable in UI)';
COMMENT ON COLUMN purchase_request_items.normalized_qty IS 'Coverage quantity in site unit used for gating and availability';
