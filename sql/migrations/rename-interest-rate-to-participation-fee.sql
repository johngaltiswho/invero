-- Rename contractor finance term column to participation_fee_rate_daily
ALTER TABLE contractors
  RENAME COLUMN interest_rate_daily TO participation_fee_rate_daily;

COMMENT ON COLUMN contractors.participation_fee_rate_daily IS 'Daily project participation fee rate as a decimal (e.g., 0.001 = 0.1% per day)';
