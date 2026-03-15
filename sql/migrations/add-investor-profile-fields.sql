-- Add structured investor profile fields for agreement and payout workflows

ALTER TABLE investors
  ADD COLUMN IF NOT EXISTS pan_number VARCHAR(32),
  ADD COLUMN IF NOT EXISTS address TEXT;

COMMENT ON COLUMN investors.pan_number IS 'Investor PAN number used for agreements and tax reporting';
COMMENT ON COLUMN investors.address IS 'Investor address used for agreements and notices';
