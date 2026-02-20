-- Investor payment submissions workflow
-- Keeps raw investor payment confirmations separate from approved ledger transactions.

CREATE TABLE IF NOT EXISTS investor_payment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  amount DECIMAL(14,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  payment_method VARCHAR NOT NULL DEFAULT 'bank_transfer',
  payment_reference VARCHAR,
  notes TEXT,
  proof_document_path TEXT,

  status VARCHAR NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  review_notes TEXT,

  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by VARCHAR,
  capital_transaction_id UUID REFERENCES capital_transactions(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investor_payment_submissions_investor
  ON investor_payment_submissions(investor_id);

CREATE INDEX IF NOT EXISTS idx_investor_payment_submissions_status
  ON investor_payment_submissions(status);

CREATE INDEX IF NOT EXISTS idx_investor_payment_submissions_created_at
  ON investor_payment_submissions(created_at DESC);

CREATE TRIGGER update_investor_payment_submissions_updated_at
  BEFORE UPDATE ON investor_payment_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE investor_payment_submissions IS
  'Investor-submitted inflow confirmations awaiting admin review';
