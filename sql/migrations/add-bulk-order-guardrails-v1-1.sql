-- Bulk Orders v1.1: guardrails, admin approval lifecycle, and usage baselines

-- 1) Extend contractors with bulk-order settings
ALTER TABLE contractors
  ADD COLUMN IF NOT EXISTS bulk_order_multiplier DECIMAL(6,3) DEFAULT 1.500,
  ADD COLUMN IF NOT EXISTS bulk_outstanding_months_cap DECIMAL(6,3) DEFAULT 2.000,
  ADD COLUMN IF NOT EXISTS bulk_order_credit_limit DECIMAL(14,2),
  ADD COLUMN IF NOT EXISTS bulk_supply_blocked BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN contractors.bulk_order_multiplier IS 'Max order quantity multiplier vs declared monthly usage';
COMMENT ON COLUMN contractors.bulk_outstanding_months_cap IS 'Max outstanding value in months of usage value';
COMMENT ON COLUMN contractors.bulk_order_credit_limit IS 'Optional INR hard cap on bulk outstanding exposure';
COMMENT ON COLUMN contractors.bulk_supply_blocked IS 'If true, contractor cannot create/submit/approve bulk orders';

-- 2) Contractor material usage baselines
CREATE TABLE IF NOT EXISTS contractor_material_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  monthly_usage_qty DECIMAL(12,3) NOT NULL CHECK (monthly_usage_qty > 0),
  notes TEXT,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (contractor_id, material_id)
);

CREATE INDEX IF NOT EXISTS idx_contractor_material_limits_contractor_id
  ON contractor_material_limits(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_material_limits_material_id
  ON contractor_material_limits(material_id);

ALTER TABLE contractor_material_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors can view own material limits" ON contractor_material_limits
  FOR SELECT
  USING (
    contractor_id IN (
      SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Contractors can upsert own material limits" ON contractor_material_limits
  FOR INSERT
  WITH CHECK (
    contractor_id IN (
      SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Contractors can update own material limits" ON contractor_material_limits
  FOR UPDATE
  USING (
    contractor_id IN (
      SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Service role full access on material limits" ON contractor_material_limits
  FOR ALL
  USING (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS update_contractor_material_limits_updated_at ON contractor_material_limits;
CREATE TRIGGER update_contractor_material_limits_updated_at
  BEFORE UPDATE ON contractor_material_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3) Extend buyer_bulk_orders lifecycle metadata
ALTER TABLE buyer_bulk_orders
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Replace status check to include submitted/rejected while preserving backward-compatibility with draft
ALTER TABLE buyer_bulk_orders
  DROP CONSTRAINT IF EXISTS buyer_bulk_orders_status_check;

ALTER TABLE buyer_bulk_orders
  ADD CONSTRAINT buyer_bulk_orders_status_check
  CHECK (
    status IN (
      'draft',
      'submitted',
      'approved',
      'ordered',
      'received',
      'invoiced',
      'active_repayment',
      'closed',
      'rejected',
      'defaulted'
    )
  );

ALTER TABLE buyer_bulk_orders
  ALTER COLUMN status SET DEFAULT 'submitted';

CREATE INDEX IF NOT EXISTS idx_buyer_bulk_orders_submitted_at
  ON buyer_bulk_orders(submitted_at DESC);

