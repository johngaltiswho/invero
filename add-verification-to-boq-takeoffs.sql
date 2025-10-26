-- Add verification fields to existing boq_takeoffs table

ALTER TABLE boq_takeoffs ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'none' 
  CHECK (verification_status IN ('none', 'pending', 'verified', 'disputed', 'revision_required'));

ALTER TABLE boq_takeoffs ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE boq_takeoffs ADD COLUMN IF NOT EXISTS verified_by VARCHAR(100);
ALTER TABLE boq_takeoffs ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE boq_takeoffs ADD COLUMN IF NOT EXISTS is_funding_eligible BOOLEAN DEFAULT FALSE;
ALTER TABLE boq_takeoffs ADD COLUMN IF NOT EXISTS submitted_for_verification_at TIMESTAMP WITH TIME ZONE;

-- Add index for verification status
CREATE INDEX IF NOT EXISTS idx_boq_takeoffs_verification_status ON boq_takeoffs(verification_status);

-- Add trigger to set funding eligibility when verified
CREATE OR REPLACE FUNCTION update_boq_takeoff_funding_eligibility()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.verification_status = 'verified' AND OLD.verification_status != 'verified' THEN
        NEW.is_funding_eligible = TRUE;
    ELSIF NEW.verification_status != 'verified' THEN
        NEW.is_funding_eligible = FALSE;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_boq_takeoff_funding_eligibility_trigger
    BEFORE UPDATE OF verification_status ON boq_takeoffs
    FOR EACH ROW
    EXECUTE FUNCTION update_boq_takeoff_funding_eligibility();