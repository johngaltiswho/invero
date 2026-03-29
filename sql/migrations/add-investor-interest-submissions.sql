CREATE TABLE IF NOT EXISTS investor_interest_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  preferred_model VARCHAR(32) NOT NULL
    CHECK (preferred_model IN ('pool_participation', 'fixed_debt', 'open_to_both')),
  proposed_amount DECIMAL(15,2) NOT NULL CHECK (proposed_amount > 0),
  indicative_pool_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  indicative_fixed_debt_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  liquidity_preference VARCHAR(32)
    CHECK (liquidity_preference IN ('flexible', 'income_focused', 'balanced', 'higher_return')),
  notes TEXT,
  status VARCHAR(24) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewed', 'allocation_prepared', 'converted', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investor_interest_submissions_investor
  ON investor_interest_submissions(investor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_investor_interest_submissions_status
  ON investor_interest_submissions(status, created_at DESC);

DROP TRIGGER IF EXISTS update_investor_interest_submissions_updated_at ON investor_interest_submissions;
CREATE TRIGGER update_investor_interest_submissions_updated_at
  BEFORE UPDATE ON investor_interest_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE investor_interest_submissions IS 'Investor-declared interest in pool participation, fixed income, or blended allocation before admin prepares the final proposal.';
