-- Migration: Add delivery tracking to purchase_requests and create invoices table
-- Run this against your Supabase database

-- 1. Add delivery tracking columns to purchase_requests
ALTER TABLE purchase_requests
  ADD COLUMN IF NOT EXISTS delivery_status VARCHAR DEFAULT 'not_dispatched'
    CHECK (delivery_status IN ('not_dispatched', 'dispatched', 'disputed', 'delivered')),
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS dispute_deadline TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS dispute_raised_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS invoice_generated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS invoice_url TEXT;

-- 2. Create the invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_request_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  project_id VARCHAR NOT NULL,
  invoice_number VARCHAR NOT NULL UNIQUE,
  invoice_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_amount DECIMAL(14, 2) NOT NULL,
  line_items JSONB NOT NULL,  -- snapshot of items at time of generation
  invoice_url TEXT,
  status VARCHAR DEFAULT 'generated'
    CHECK (status IN ('generated', 'sent', 'acknowledged')),
  generated_by VARCHAR DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_invoices_purchase_request ON invoices(purchase_request_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contractor ON invoices(contractor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_delivery_status ON purchase_requests(delivery_status);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_dispute_deadline ON purchase_requests(dispute_deadline)
  WHERE delivery_status = 'dispatched';

-- 4. Sequence for human-readable invoice numbers: INV-YYYY-NNNNN
-- Used by the invoice generation function
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- Function to generate the next invoice number
CREATE OR REPLACE FUNCTION next_invoice_number()
RETURNS VARCHAR AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  seq_val := nextval('invoice_number_seq');
  RETURN 'INV-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- 5. Enable RLS on invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Contractors can view their own invoices
CREATE POLICY "Contractors can view own invoices" ON invoices
  FOR SELECT
  USING (
    contractor_id IN (
      SELECT id FROM contractors WHERE clerk_user_id = (auth.jwt() ->> 'sub')
    )
  );

-- Service role has full access (used by API routes and cron)
CREATE POLICY "Service role full access on invoices" ON invoices
  FOR ALL
  USING (auth.role() = 'service_role');

-- 6. updated_at trigger for invoices
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();
