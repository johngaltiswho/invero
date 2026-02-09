-- Add configurable finance terms for contractors
ALTER TABLE contractors
  ADD COLUMN IF NOT EXISTS platform_fee_rate DECIMAL(6,5) DEFAULT 0.00250,
  ADD COLUMN IF NOT EXISTS platform_fee_cap DECIMAL(12,2) DEFAULT 25000,
  ADD COLUMN IF NOT EXISTS interest_rate_daily DECIMAL(6,5) DEFAULT 0.00100;

COMMENT ON COLUMN contractors.platform_fee_rate IS 'Platform fee rate as a decimal (e.g., 0.0025 = 0.25%)';
COMMENT ON COLUMN contractors.platform_fee_cap IS 'Maximum platform fee amount in INR';
COMMENT ON COLUMN contractors.interest_rate_daily IS 'Daily interest rate as a decimal (e.g., 0.001 = 0.1% per day)';
