-- Add bank details columns for investor payouts
ALTER TABLE investors
  ADD COLUMN IF NOT EXISTS bank_account_holder VARCHAR(255),
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(64),
  ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(32),
  ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(255),
  ADD COLUMN IF NOT EXISTS cancelled_cheque_path TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_cheque_uploaded_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN investors.bank_account_holder IS 'Account holder name for payout';
COMMENT ON COLUMN investors.bank_name IS 'Bank name for payout';
COMMENT ON COLUMN investors.bank_account_number IS 'Bank account number for payout';
COMMENT ON COLUMN investors.bank_ifsc IS 'IFSC code for payout';
COMMENT ON COLUMN investors.bank_branch IS 'Bank branch for payout';
COMMENT ON COLUMN investors.cancelled_cheque_path IS 'Storage path for cancelled cheque upload';
COMMENT ON COLUMN investors.cancelled_cheque_uploaded_at IS 'Timestamp when cancelled cheque was uploaded';
