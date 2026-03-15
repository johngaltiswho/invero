-- Add in-portal investor signing fields and status

ALTER TABLE investor_agreements
  ADD COLUMN IF NOT EXISTS investor_signed_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS investor_signed_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS investor_signed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS investor_signed_ip VARCHAR(255),
  ADD COLUMN IF NOT EXISTS investor_signed_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS investor_acceptance JSONB;

ALTER TABLE investor_agreements
  DROP CONSTRAINT IF EXISTS investor_agreements_status_check;

ALTER TABLE investor_agreements
  ADD CONSTRAINT investor_agreements_status_check
  CHECK (status IN ('draft', 'generated', 'issued', 'investor_signed', 'signed_copy_received', 'executed', 'voided', 'expired'));

COMMENT ON COLUMN investor_agreements.investor_signed_name IS 'Typed full name used for in-portal investor signature';
COMMENT ON COLUMN investor_agreements.investor_signed_email IS 'Investor email captured at signature time';
COMMENT ON COLUMN investor_agreements.investor_signed_at IS 'Timestamp of in-portal investor signature';
COMMENT ON COLUMN investor_agreements.investor_signed_ip IS 'IP captured at signature time';
COMMENT ON COLUMN investor_agreements.investor_signed_user_agent IS 'User agent captured at signature time';
COMMENT ON COLUMN investor_agreements.investor_acceptance IS 'Consent checkboxes captured at in-portal signature time';
