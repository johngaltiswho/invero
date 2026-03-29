CREATE TABLE IF NOT EXISTS lender_allocation_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'agreements_pending', 'ready_for_funding', 'funding_submitted', 'completed', 'cancelled', 'superseded')),
  total_amount DECIMAL(15,2) NOT NULL CHECK (total_amount > 0),
  currency VARCHAR(16) NOT NULL DEFAULT 'INR',
  allocation_payload JSONB NOT NULL DEFAULT '[]'::jsonb,
  pool_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  fixed_debt_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  required_models JSONB NOT NULL DEFAULT '[]'::jsonb,
  agreements_ready_at TIMESTAMP WITH TIME ZONE,
  funding_submitted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  superseded_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lender_allocation_intents_investor
  ON lender_allocation_intents(investor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lender_allocation_intents_status
  ON lender_allocation_intents(status);

ALTER TABLE investor_agreements
  ADD COLUMN IF NOT EXISTS lender_allocation_intent_id UUID REFERENCES lender_allocation_intents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS superseded_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_investor_agreements_allocation_intent_id
  ON investor_agreements(lender_allocation_intent_id);

CREATE INDEX IF NOT EXISTS idx_investor_agreements_superseded_at
  ON investor_agreements(superseded_at);

ALTER TABLE investor_payment_submissions
  ADD COLUMN IF NOT EXISTS allocation_intent_id UUID REFERENCES lender_allocation_intents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_investor_payment_submissions_allocation_intent
  ON investor_payment_submissions(allocation_intent_id);

UPDATE investor_agreements
SET
  superseded_at = NOW(),
  superseded_reason = COALESCE(superseded_reason, 'Superseded by agreement-first funding rollout')
WHERE status <> 'executed'
  AND superseded_at IS NULL;

UPDATE investor_payment_submissions
SET
  status = 'rejected',
  review_notes = TRIM(BOTH FROM CONCAT(COALESCE(review_notes, ''), CASE WHEN COALESCE(review_notes, '') <> '' THEN E'\n' ELSE '' END, 'Rejected by agreement-first funding rollout. Prepare a fresh allocation and submit capital against the new allocation intent flow.')),
  approved_at = COALESCE(approved_at, NOW()),
  approved_by = COALESCE(approved_by, 'system')
WHERE status = 'pending'
  AND allocation_intent_id IS NULL;

DROP TRIGGER IF EXISTS update_lender_allocation_intents_updated_at ON lender_allocation_intents;
CREATE TRIGGER update_lender_allocation_intents_updated_at
  BEFORE UPDATE ON lender_allocation_intents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE lender_allocation_intents IS 'Agreement-first funding intents that freeze the selected sleeve allocation before payment submission';
COMMENT ON COLUMN investor_agreements.lender_allocation_intent_id IS 'Allocation intent that originated the current sleeve agreement';
COMMENT ON COLUMN investor_agreements.superseded_at IS 'Timestamp when a non-executed agreement stopped being actionable for funding';
COMMENT ON COLUMN investor_agreements.superseded_reason IS 'Reason the agreement is no longer current for funding';
COMMENT ON COLUMN investor_payment_submissions.allocation_intent_id IS 'Frozen allocation intent referenced by this payment submission';
