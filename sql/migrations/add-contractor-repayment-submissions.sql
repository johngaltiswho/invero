CREATE TABLE IF NOT EXISTS contractor_repayment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  purchase_request_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  payment_method VARCHAR(32) NOT NULL DEFAULT 'bank_transfer'
    CHECK (payment_method IN ('bank_transfer', 'upi', 'cheque', 'other')),
  payment_reference TEXT,
  notes TEXT,
  proof_document_path TEXT,
  status VARCHAR(24) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  review_notes TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by TEXT,
  processed_transaction_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contractor_repayment_submissions_contractor_created
  ON contractor_repayment_submissions(contractor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contractor_repayment_submissions_purchase_request
  ON contractor_repayment_submissions(purchase_request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contractor_repayment_submissions_status
  ON contractor_repayment_submissions(status, created_at DESC);

DROP TRIGGER IF EXISTS update_contractor_repayment_submissions_updated_at ON contractor_repayment_submissions;
CREATE TRIGGER update_contractor_repayment_submissions_updated_at
  BEFORE UPDATE ON contractor_repayment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE contractor_repayment_submissions IS
  'Contractor-submitted repayment confirmations awaiting admin review before posting capital return transactions.';
