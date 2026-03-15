-- Allow agreement-specific investor identity overrides before issue

ALTER TABLE investor_agreements
  ADD COLUMN IF NOT EXISTS investor_pan VARCHAR(32),
  ADD COLUMN IF NOT EXISTS investor_address TEXT;

COMMENT ON COLUMN investor_agreements.investor_pan IS 'Agreement-level PAN override captured before issue';
COMMENT ON COLUMN investor_agreements.investor_address IS 'Agreement-level address override captured before issue';
