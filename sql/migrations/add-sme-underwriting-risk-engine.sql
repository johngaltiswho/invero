CREATE TABLE IF NOT EXISTS sme_underwriting_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  case_type VARCHAR(24) NOT NULL DEFAULT 'initial'
    CHECK (case_type IN ('initial', 'renewal', 'enhancement', 'po_review', 'exception')),
  status VARCHAR(32) NOT NULL DEFAULT 'draft'
    CHECK (
      status IN (
        'draft',
        'under_review',
        'scored',
        'recommended',
        'approved',
        'rejected',
        'expired',
        'superseded'
      )
    ),
  engine_version VARCHAR(32) NOT NULL DEFAULT 'v1',
  created_by TEXT,
  reviewed_by TEXT,
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sme_underwriting_cases_contractor_created
  ON sme_underwriting_cases(contractor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sme_underwriting_cases_status
  ON sme_underwriting_cases(status);

CREATE TABLE IF NOT EXISTS sme_underwriting_financial_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  underwriting_case_id UUID NOT NULL UNIQUE REFERENCES sme_underwriting_cases(id) ON DELETE CASCADE,
  annual_turnover DECIMAL(15,2),
  ebitda DECIMAL(15,2),
  net_operating_surplus DECIMAL(15,2),
  current_ratio DECIMAL(10,2),
  total_debt DECIMAL(15,2),
  gst_filing_score DECIMAL(5,2),
  avg_monthly_bank_credits DECIMAL(15,2),
  avg_month_end_balance DECIMAL(15,2),
  business_vintage_years DECIMAL(5,2),
  bureau_score INTEGER,
  promoter_repayment_score DECIMAL(5,2),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sme_underwriting_po_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  underwriting_case_id UUID NOT NULL REFERENCES sme_underwriting_cases(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  po_number TEXT,
  customer_name TEXT,
  customer_category VARCHAR(32)
    CHECK (customer_category IN ('government', 'psu', 'listed', 'mnc', 'corporate', 'private', 'other')),
  po_value DECIMAL(15,2),
  eligible_po_base DECIMAL(15,2),
  retention_percent DECIMAL(7,2),
  payment_terms_days INTEGER,
  already_billed_amount DECIMAL(15,2),
  already_financed_amount DECIMAL(15,2),
  expected_collection_days INTEGER,
  gross_margin_percent DECIMAL(7,2),
  concentration_percent DECIMAL(7,2),
  document_strength_score DECIMAL(5,2),
  execution_risk_score DECIMAL(5,2),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sme_underwriting_po_inputs_case
  ON sme_underwriting_po_inputs(underwriting_case_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sme_underwriting_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  underwriting_case_id UUID NOT NULL UNIQUE REFERENCES sme_underwriting_cases(id) ON DELETE CASCADE,
  financial_score DECIMAL(7,2),
  financial_band VARCHAR(4)
    CHECK (financial_band IN ('A', 'B', 'C', 'D')),
  financial_limit DECIMAL(15,2),
  po_score DECIMAL(7,2),
  po_band VARCHAR(4)
    CHECK (po_band IN ('P1', 'P2', 'P3', 'P4')),
  po_limit DECIMAL(15,2),
  policy_cap DECIMAL(15,2),
  recommended_limit DECIMAL(15,2),
  approved_limit DECIMAL(15,2),
  recommended_tenor_days INTEGER,
  approved_tenor_days INTEGER,
  max_drawdown_per_request DECIMAL(15,2),
  repayment_basis VARCHAR(32)
    CHECK (repayment_basis IN ('invoice_linked', 'delivery_linked', 'fixed_cycle', 'client_payment_to_escrow')),
  decision VARCHAR(24)
    CHECK (decision IN ('approve', 'conditional', 'reject')),
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sme_credit_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  underwriting_case_id UUID REFERENCES sme_underwriting_cases(id) ON DELETE SET NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'suspended', 'expired', 'closed')),
  approved_limit DECIMAL(15,2) NOT NULL DEFAULT 0,
  approved_tenor_days INTEGER,
  max_drawdown_per_request DECIMAL(15,2),
  repayment_basis VARCHAR(32)
    CHECK (repayment_basis IN ('invoice_linked', 'delivery_linked', 'fixed_cycle', 'client_payment_to_escrow')),
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_to TIMESTAMP WITH TIME ZONE,
  review_due_at TIMESTAMP WITH TIME ZONE,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sme_credit_lines_contractor_status
  ON sme_credit_lines(contractor_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS sme_credit_line_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_line_id UUID NOT NULL REFERENCES sme_credit_lines(id) ON DELETE CASCADE,
  event_type VARCHAR(32) NOT NULL
    CHECK (event_type IN ('created', 'approved', 'limit_changed', 'tenor_changed', 'suspended', 'reactivated', 'expired', 'closed')),
  old_value JSONB,
  new_value JSONB,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE contractor_underwriting_profiles
  ADD COLUMN IF NOT EXISTS active_underwriting_case_id UUID REFERENCES sme_underwriting_cases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS active_credit_line_id UUID REFERENCES sme_credit_lines(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS update_sme_underwriting_cases_updated_at ON sme_underwriting_cases;
CREATE TRIGGER update_sme_underwriting_cases_updated_at
  BEFORE UPDATE ON sme_underwriting_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sme_underwriting_financial_inputs_updated_at ON sme_underwriting_financial_inputs;
CREATE TRIGGER update_sme_underwriting_financial_inputs_updated_at
  BEFORE UPDATE ON sme_underwriting_financial_inputs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sme_underwriting_po_inputs_updated_at ON sme_underwriting_po_inputs;
CREATE TRIGGER update_sme_underwriting_po_inputs_updated_at
  BEFORE UPDATE ON sme_underwriting_po_inputs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sme_underwriting_scores_updated_at ON sme_underwriting_scores;
CREATE TRIGGER update_sme_underwriting_scores_updated_at
  BEFORE UPDATE ON sme_underwriting_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sme_credit_lines_updated_at ON sme_credit_lines;
CREATE TRIGGER update_sme_credit_lines_updated_at
  BEFORE UPDATE ON sme_credit_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE sme_underwriting_cases IS 'Case-based underwriting reviews for SME financing and PO-backed exposure decisions.';
COMMENT ON TABLE sme_underwriting_financial_inputs IS 'Normalized financial inputs used by the SME risk engine.';
COMMENT ON TABLE sme_underwriting_po_inputs IS 'PO and project-linked risk inputs for underwriting cases.';
COMMENT ON TABLE sme_underwriting_scores IS 'Stored engine outputs and approval recommendations for each underwriting case.';
COMMENT ON TABLE sme_credit_lines IS 'Approved live SME credit lines derived from underwriting cases.';
COMMENT ON TABLE sme_credit_line_events IS 'Audit trail for approved SME credit line changes.';
