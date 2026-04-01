CREATE TABLE IF NOT EXISTS fuel_provider_agreements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pump_id UUID NOT NULL REFERENCES fuel_pumps(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'generated', 'issued', 'provider_signed', 'executed', 'voided', 'expired')),
  agreement_date DATE NOT NULL,
  template_key VARCHAR(128) NOT NULL,
  template_version VARCHAR(32) NOT NULL,
  payload_snapshot JSONB,
  rendered_html TEXT,
  draft_pdf_path TEXT,
  signed_pdf_path TEXT,
  executed_pdf_path TEXT,
  provider_signed_name TEXT,
  provider_signed_email TEXT,
  provider_signed_at TIMESTAMP WITH TIME ZONE,
  company_signatory_name TEXT,
  company_signatory_title TEXT,
  issued_at TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fuel_provider_agreements_pump_created
  ON fuel_provider_agreements(pump_id, created_at DESC);

CREATE TABLE IF NOT EXISTS fuel_provider_agreement_delivery_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fuel_provider_agreement_id UUID NOT NULL REFERENCES fuel_provider_agreements(id) ON DELETE CASCADE,
  delivery_channel VARCHAR(16) NOT NULL DEFAULT 'email'
    CHECK (delivery_channel IN ('email')),
  recipient_email TEXT NOT NULL,
  delivery_status VARCHAR(16) NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'sent', 'failed')),
  subject TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_fuel_provider_agreements_updated_at ON fuel_provider_agreements;
CREATE TRIGGER update_fuel_provider_agreements_updated_at
  BEFORE UPDATE ON fuel_provider_agreements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fuel_provider_agreement_delivery_logs_updated_at ON fuel_provider_agreement_delivery_logs;
CREATE TRIGGER update_fuel_provider_agreement_delivery_logs_updated_at
  BEFORE UPDATE ON fuel_provider_agreement_delivery_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE fuel_provider_agreements IS 'Agreement lifecycle for fuel pump / provider onboarding and settlement terms.';
COMMENT ON TABLE fuel_provider_agreement_delivery_logs IS 'Email delivery log for fuel provider agreements.';
