-- Lender sleeves and mixed-model capital allocation support

CREATE TABLE IF NOT EXISTS lender_sleeves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  model_type VARCHAR(32) NOT NULL
    CHECK (model_type IN ('fixed_debt', 'pool_participation')),
  status VARCHAR(32) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'suspended', 'closed')),
  name VARCHAR(255) NOT NULL,
  agreement_status VARCHAR(32) NOT NULL DEFAULT 'not_started'
    CHECK (agreement_status IN ('not_started', 'in_progress', 'completed', 'voided', 'expired')),
  commitment_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  funded_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency VARCHAR(16) NOT NULL DEFAULT 'INR',
  start_date DATE,
  executed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,

  fixed_coupon_rate_annual DECIMAL(8,4),
  principal_outstanding DECIMAL(15,2) NOT NULL DEFAULT 0,
  coupon_accrued DECIMAL(15,2) NOT NULL DEFAULT 0,
  coupon_paid DECIMAL(15,2) NOT NULL DEFAULT 0,
  payout_priority_rank INTEGER,
  alm_bucket VARCHAR(64),
  liquidity_notes TEXT,

  units_held DECIMAL(18,6) NOT NULL DEFAULT 0,
  entry_nav_per_unit DECIMAL(15,4),
  ownership_percent_snapshot DECIMAL(10,4),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lender_sleeves_unique_model_per_investor
  ON lender_sleeves(investor_id, model_type);

CREATE INDEX IF NOT EXISTS idx_lender_sleeves_investor
  ON lender_sleeves(investor_id);

CREATE INDEX IF NOT EXISTS idx_lender_sleeves_status
  ON lender_sleeves(status);

CREATE TABLE IF NOT EXISTS lender_capital_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  lender_sleeve_id UUID NOT NULL REFERENCES lender_sleeves(id) ON DELETE CASCADE,
  capital_transaction_id UUID REFERENCES capital_transactions(id) ON DELETE SET NULL,
  payment_submission_id UUID REFERENCES investor_payment_submissions(id) ON DELETE SET NULL,
  allocation_amount DECIMAL(15,2) NOT NULL CHECK (allocation_amount > 0),
  allocation_percent DECIMAL(8,4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lender_capital_allocations_investor
  ON lender_capital_allocations(investor_id);

CREATE INDEX IF NOT EXISTS idx_lender_capital_allocations_sleeve
  ON lender_capital_allocations(lender_sleeve_id);

ALTER TABLE investor_agreements
  ADD COLUMN IF NOT EXISTS lender_sleeve_id UUID REFERENCES lender_sleeves(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agreement_model_type VARCHAR(32)
    CHECK (agreement_model_type IN ('fixed_debt', 'pool_participation'));

CREATE INDEX IF NOT EXISTS idx_investor_agreements_lender_sleeve_id
  ON investor_agreements(lender_sleeve_id);

ALTER TABLE investor_payment_submissions
  ADD COLUMN IF NOT EXISTS allocation_payload JSONB;

ALTER TABLE capital_transactions
  ADD COLUMN IF NOT EXISTS lender_sleeve_id UUID REFERENCES lender_sleeves(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS model_type VARCHAR(32)
    CHECK (model_type IN ('fixed_debt', 'pool_participation'));

CREATE INDEX IF NOT EXISTS idx_capital_transactions_lender_sleeve
  ON capital_transactions(lender_sleeve_id);

INSERT INTO lender_sleeves (
  investor_id,
  model_type,
  status,
  name,
  agreement_status,
  commitment_amount,
  funded_amount,
  currency,
  start_date
)
SELECT
  i.id,
  'pool_participation',
  CASE WHEN i.activation_status = 'active' THEN 'active' ELSE 'draft' END,
  'Pool Participation Sleeve',
  COALESCE(i.agreement_status, 'not_started'),
  COALESCE(ia.total_committed, 0),
  COALESCE(ia.total_committed, 0),
  'INR',
  CURRENT_DATE
FROM investors i
LEFT JOIN investor_accounts ia ON ia.investor_id = i.id
WHERE NOT EXISTS (
  SELECT 1
  FROM lender_sleeves ls
  WHERE ls.investor_id = i.id
    AND ls.model_type = 'pool_participation'
);

UPDATE investor_agreements ia
SET
  lender_sleeve_id = ls.id,
  agreement_model_type = 'pool_participation'
FROM lender_sleeves ls
WHERE ia.investor_id = ls.investor_id
  AND ls.model_type = 'pool_participation'
  AND (ia.lender_sleeve_id IS NULL OR ia.agreement_model_type IS NULL);

INSERT INTO lender_capital_allocations (
  investor_id,
  lender_sleeve_id,
  capital_transaction_id,
  allocation_amount,
  allocation_percent
)
SELECT
  ct.investor_id,
  ls.id,
  ct.id,
  ct.amount,
  100
FROM capital_transactions ct
JOIN lender_sleeves ls
  ON ls.investor_id = ct.investor_id
 AND ls.model_type = 'pool_participation'
WHERE ct.transaction_type = 'inflow'
  AND NOT EXISTS (
    SELECT 1
    FROM lender_capital_allocations lca
    WHERE lca.capital_transaction_id = ct.id
  );

CREATE OR REPLACE TRIGGER update_lender_sleeves_updated_at
  BEFORE UPDATE ON lender_sleeves
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE lender_sleeves IS 'Model-specific lender capital buckets under a single lender profile';
COMMENT ON TABLE lender_capital_allocations IS 'Split allocation of lender contributions into sleeves';
COMMENT ON COLUMN investor_agreements.lender_sleeve_id IS 'Sleeve associated with this lender agreement';
COMMENT ON COLUMN investor_agreements.agreement_model_type IS 'Economic model for the agreement template';
