-- Investor agreement POC tables and lightweight investor activation fields

ALTER TABLE investors
  ADD COLUMN IF NOT EXISTS agreement_status VARCHAR(32)
    DEFAULT 'not_started'
    CHECK (agreement_status IN ('not_started', 'in_progress', 'completed', 'voided', 'expired')),
  ADD COLUMN IF NOT EXISTS agreement_completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS activation_status VARCHAR(32)
    DEFAULT 'inactive'
    CHECK (activation_status IN ('inactive', 'agreement_pending', 'active', 'suspended'));

CREATE TABLE IF NOT EXISTS investor_agreements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  agreement_type VARCHAR(64) NOT NULL DEFAULT 'investor_participation_poc',
  status VARCHAR(32) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'generated', 'issued', 'signed_copy_received', 'executed', 'voided', 'expired')),
  commitment_amount DECIMAL(15, 2) NOT NULL DEFAULT 100000 CHECK (commitment_amount >= 0),
  agreement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  template_key VARCHAR(128) NOT NULL DEFAULT 'investor-participation-poc',
  template_version VARCHAR(32) NOT NULL DEFAULT 'v1',
  payload_snapshot JSONB,
  rendered_html TEXT,
  draft_pdf_path TEXT,
  signed_pdf_path TEXT,
  executed_pdf_path TEXT,
  company_signatory_name VARCHAR(255),
  company_signatory_title VARCHAR(255),
  issued_at TIMESTAMP WITH TIME ZONE,
  signed_copy_received_at TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by VARCHAR(255),
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agreement_delivery_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  investor_agreement_id UUID NOT NULL REFERENCES investor_agreements(id) ON DELETE CASCADE,
  delivery_channel VARCHAR(32) NOT NULL DEFAULT 'email'
    CHECK (delivery_channel IN ('email')),
  recipient_email VARCHAR(255) NOT NULL,
  delivery_status VARCHAR(32) NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'sent', 'failed')),
  subject TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investor_agreements_investor_id
  ON investor_agreements(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_agreements_status
  ON investor_agreements(status);
CREATE INDEX IF NOT EXISTS idx_investor_agreements_created_at
  ON investor_agreements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agreement_delivery_logs_agreement_id
  ON agreement_delivery_logs(investor_agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreement_delivery_logs_created_at
  ON agreement_delivery_logs(created_at DESC);

ALTER TABLE investor_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to investor_agreements"
  ON investor_agreements FOR ALL USING (true);

CREATE POLICY "Admin full access to agreement_delivery_logs"
  ON agreement_delivery_logs FOR ALL USING (true);

CREATE OR REPLACE TRIGGER update_investor_agreements_updated_at
  BEFORE UPDATE ON investor_agreements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_agreement_delivery_logs_updated_at
  BEFORE UPDATE ON agreement_delivery_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE investor_agreements IS 'POC investor agreement lifecycle records';
COMMENT ON TABLE agreement_delivery_logs IS 'Delivery log for investor agreement sends';
COMMENT ON COLUMN investor_agreements.payload_snapshot IS 'Exact payload used to generate draft PDF';
COMMENT ON COLUMN investor_agreements.rendered_html IS 'Rendered agreement HTML snapshot for provider-ready e-sign migration';
