-- Allow flexible HSN/SAC values without strict length constraints.
ALTER TABLE materials
  ALTER COLUMN hsn_code TYPE TEXT;

ALTER TABLE purchase_request_items
  ALTER COLUMN hsn_code TYPE TEXT;

COMMENT ON COLUMN materials.hsn_code IS 'HSN/SAC code (free-text in v1; canonical source for defaults)';
COMMENT ON COLUMN purchase_request_items.hsn_code IS 'HSN/SAC captured at request-item level (overridable pre-invoice)';
