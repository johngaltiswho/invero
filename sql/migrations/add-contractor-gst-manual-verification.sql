ALTER TABLE contractors
  ADD COLUMN IF NOT EXISTS gst_manual_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gst_manual_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS gst_manual_verified_by TEXT,
  ADD COLUMN IF NOT EXISTS gst_manual_verification_notes TEXT;

COMMENT ON COLUMN contractors.gst_manual_verified IS 'Whether GST details were manually checked on the GST portal by Finverno ops/admin.';
COMMENT ON COLUMN contractors.gst_manual_verified_at IS 'Timestamp when GST details were manually verified by Finverno ops/admin.';
COMMENT ON COLUMN contractors.gst_manual_verified_by IS 'Operator identifier that manually verified GST details.';
COMMENT ON COLUMN contractors.gst_manual_verification_notes IS 'Ops notes captured during manual GST verification.';
