-- Bulk procurement orders (buyer = existing contractors)
CREATE TABLE IF NOT EXISTS buyer_bulk_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  hsn_code TEXT,
  ordered_qty DECIMAL(12,3) NOT NULL CHECK (ordered_qty > 0),
  uom VARCHAR(64) NOT NULL,
  supplier_id VARCHAR(64),
  supplier_unit_rate DECIMAL(14,2) CHECK (supplier_unit_rate >= 0),
  base_cost DECIMAL(14,2) DEFAULT 0 CHECK (base_cost >= 0),
  platform_fee_amount DECIMAL(14,2) DEFAULT 0 CHECK (platform_fee_amount >= 0),
  tax_percent DECIMAL(5,2) DEFAULT 0 CHECK (tax_percent >= 0),
  tax_amount DECIMAL(14,2) DEFAULT 0 CHECK (tax_amount >= 0),
  invoice_total DECIMAL(14,2) DEFAULT 0 CHECK (invoice_total >= 0),
  tenure_months INTEGER CHECK (tenure_months > 0),
  status VARCHAR(32) NOT NULL DEFAULT 'submitted' CHECK (status IN (
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
  )),
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyer_bulk_orders_contractor_id ON buyer_bulk_orders(contractor_id);
CREATE INDEX IF NOT EXISTS idx_buyer_bulk_orders_material_id ON buyer_bulk_orders(material_id);
CREATE INDEX IF NOT EXISTS idx_buyer_bulk_orders_status ON buyer_bulk_orders(status);
CREATE INDEX IF NOT EXISTS idx_buyer_bulk_orders_project_id ON buyer_bulk_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_buyer_bulk_orders_submitted_at ON buyer_bulk_orders(submitted_at DESC);

ALTER TABLE buyer_bulk_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors can view own bulk orders" ON buyer_bulk_orders
  FOR SELECT
  USING (
    contractor_id IN (
      SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Contractors can insert own bulk orders" ON buyer_bulk_orders
  FOR INSERT
  WITH CHECK (
    contractor_id IN (
      SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Contractors can update own editable bulk orders" ON buyer_bulk_orders
  FOR UPDATE
  USING (
    contractor_id IN (
      SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Service role full access on bulk orders" ON buyer_bulk_orders
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE TRIGGER update_buyer_bulk_orders_updated_at
  BEFORE UPDATE ON buyer_bulk_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE buyer_bulk_orders IS 'Bulk procurement orders financed through deferred repayment schedules';
COMMENT ON COLUMN buyer_bulk_orders.hsn_code IS 'Defaulted from material master and can be overridden before invoicing';
