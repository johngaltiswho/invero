ALTER TABLE contractors
  ADD COLUMN IF NOT EXISTS onboarding_stage VARCHAR(40)
    CHECK (
      onboarding_stage IN (
        'application_submitted',
        'documents_pending',
        'documents_uploaded',
        'kyc_under_review',
        'kyc_approved',
        'commercial_review',
        'commercial_approved',
        'master_agreement_pending',
        'master_agreement_issued',
        'master_agreement_executed',
        'active',
        'financing_pending',
        'financing_issued',
        'financing_executed',
        'suspended',
        'rejected'
      )
    ),
  ADD COLUMN IF NOT EXISTS portal_active BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS procurement_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS financing_enabled BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE contractors
SET onboarding_stage = CASE
  WHEN status = 'rejected' OR verification_status = 'rejected' THEN 'rejected'
  WHEN status = 'suspended' THEN 'suspended'
  WHEN verification_status = 'documents_pending' THEN 'documents_pending'
  WHEN verification_status = 'documents_uploaded' THEN 'documents_uploaded'
  WHEN verification_status = 'under_verification' THEN 'kyc_under_review'
  WHEN verification_status = 'verified' AND status = 'approved' THEN 'active'
  WHEN verification_status = 'verified' THEN 'kyc_approved'
  ELSE 'application_submitted'
END
WHERE onboarding_stage IS NULL;

UPDATE contractors
SET portal_active = (status = 'approved' AND verification_status = 'verified')
WHERE portal_active IS FALSE;

UPDATE contractors
SET procurement_enabled = portal_active
WHERE procurement_enabled IS FALSE;

CREATE TABLE IF NOT EXISTS contractor_underwriting_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID NOT NULL UNIQUE REFERENCES contractors(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'commercial_review'
    CHECK (status IN ('commercial_review', 'commercial_approved', 'commercial_rejected')),
  financing_limit DECIMAL(14, 2),
  repayment_basis VARCHAR(32)
    CHECK (repayment_basis IN ('client_payment_to_escrow')),
  payment_window_days INTEGER DEFAULT 45,
  late_default_terms TEXT DEFAULT 'Repayment becomes due immediately upon receipt of the underlying client payment into the designated escrow or controlled collection account. The contractor shall not divert, delay, or otherwise withhold collections related to financed transactions. Any delay in remittance after receipt of client payment will constitute an event of payment default. Upon default, Finverno may suspend further financing, set off any amounts otherwise payable, and pursue recovery of all outstanding principal, accrued charges, and related costs. Repeated delays, diversion of collections, document discrepancies, or non-cooperation may result in immediate withdrawal of financing access.',
  notes TEXT,
  approved_by VARCHAR,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contractor_underwriting_profiles_status
  ON contractor_underwriting_profiles(status);

CREATE TABLE IF NOT EXISTS contractor_agreements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  agreement_type VARCHAR(32) NOT NULL
    CHECK (agreement_type IN ('master_platform', 'financing_addendum', 'procurement_declaration')),
  status VARCHAR(32) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'generated', 'issued', 'contractor_signed', 'executed', 'voided', 'expired')),
  agreement_date DATE NOT NULL,
  template_key VARCHAR(128) NOT NULL,
  template_version VARCHAR(32) NOT NULL,
  payload_snapshot JSONB,
  rendered_html TEXT,
  draft_pdf_path TEXT,
  signed_pdf_path TEXT,
  executed_pdf_path TEXT,
  contractor_signed_name TEXT,
  contractor_signed_email TEXT,
  contractor_signed_at TIMESTAMP WITH TIME ZONE,
  contractor_signed_ip TEXT,
  contractor_signed_user_agent TEXT,
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

CREATE INDEX IF NOT EXISTS idx_contractor_agreements_contractor_type
  ON contractor_agreements(contractor_id, agreement_type, created_at DESC);

CREATE TABLE IF NOT EXISTS contractor_agreement_delivery_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_agreement_id UUID NOT NULL REFERENCES contractor_agreements(id) ON DELETE CASCADE,
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

DROP TRIGGER IF EXISTS update_contractor_underwriting_profiles_updated_at ON contractor_underwriting_profiles;
CREATE TRIGGER update_contractor_underwriting_profiles_updated_at
  BEFORE UPDATE ON contractor_underwriting_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contractor_agreements_updated_at ON contractor_agreements;
CREATE TRIGGER update_contractor_agreements_updated_at
  BEFORE UPDATE ON contractor_agreements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contractor_agreement_delivery_logs_updated_at ON contractor_agreement_delivery_logs;
CREATE TRIGGER update_contractor_agreement_delivery_logs_updated_at
  BEFORE UPDATE ON contractor_agreement_delivery_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN contractors.onboarding_stage IS 'Normalized contractor onboarding stage used for UI and feature gating';
COMMENT ON COLUMN contractors.portal_active IS 'True once contractor is legally activated for portal procurement workflows';
COMMENT ON COLUMN contractors.procurement_enabled IS 'True once procurement workflows are available';
COMMENT ON COLUMN contractors.financing_enabled IS 'True once financing-specific workflows are available';
COMMENT ON TABLE contractor_underwriting_profiles IS 'Commercial review and financing terms for contractor onboarding';
COMMENT ON TABLE contractor_agreements IS 'Master platform and financing agreement lifecycle for contractors';
