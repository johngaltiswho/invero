-- Migration: Add fuel expense tracking and vehicle management (MVP)
-- Run this against your Supabase database

-- 1. Create fuel_expense_status enum
DO $$ BEGIN
  CREATE TYPE fuel_expense_status AS ENUM (
    'submitted',       -- Driver uploaded photo
    'ocr_processing',  -- OCR in progress
    'ocr_failed',      -- OCR failed, needs manual entry
    'pending_review',  -- Ready for admin review
    'approved',        -- Approved, funds deployed
    'rejected'         -- Rejected by admin
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  vehicle_number VARCHAR(20) NOT NULL, -- e.g., "KA01AB1234"
  vehicle_type VARCHAR(50) NOT NULL, -- e.g., "Truck", "JCB"
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create fuel_expenses table
CREATE TABLE IF NOT EXISTS fuel_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,

  -- Bill photo
  bill_image_url TEXT NOT NULL, -- Supabase Storage URL

  -- OCR extracted data (nullable until processed)
  bill_number VARCHAR(100),
  bill_date DATE,
  pump_name VARCHAR(200), -- Extracted from bill
  fuel_type VARCHAR(20), -- "Petrol" or "Diesel"
  quantity_liters DECIMAL(10,2),
  rate_per_liter DECIMAL(10,2),
  total_amount DECIMAL(15,2),

  -- OCR metadata
  ocr_raw_response JSONB, -- Store full OCR response for debugging
  ocr_confidence_score DECIMAL(3,2), -- 0.0 to 1.0 (future use)

  -- Admin review
  status fuel_expense_status DEFAULT 'submitted',
  admin_notes TEXT,
  approved_by UUID, -- References users table (not enforced with FK for flexibility)
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_reason TEXT,

  -- Timestamps
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Indexes for common query patterns
-- Vehicles indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_contractor ON vehicles(contractor_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_number_contractor
  ON vehicles(vehicle_number, contractor_id) WHERE is_active = true;

-- Fuel expenses indexes
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_contractor ON fuel_expenses(contractor_id);
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_vehicle ON fuel_expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_status ON fuel_expenses(status);
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_date ON fuel_expenses(bill_date);
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_submitted_at ON fuel_expenses(submitted_at DESC);

-- 5. Enable RLS on both tables
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_expenses ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for vehicles table
-- Contractors can manage their own vehicles
CREATE POLICY "Contractors CRUD own vehicles" ON vehicles
  FOR ALL
  USING (
    contractor_id IN (
      SELECT id FROM contractors WHERE clerk_user_id = (auth.jwt() ->> 'sub')
    )
  );

-- Service role has full access
CREATE POLICY "Service role full access on vehicles" ON vehicles
  FOR ALL
  USING (auth.role() = 'service_role');

-- 7. RLS Policies for fuel_expenses table
-- Contractors can view their own expenses
CREATE POLICY "Contractors view own expenses" ON fuel_expenses
  FOR SELECT
  USING (
    contractor_id IN (
      SELECT id FROM contractors WHERE clerk_user_id = (auth.jwt() ->> 'sub')
    )
  );

-- Contractors can submit expenses (INSERT only, status must be 'submitted')
CREATE POLICY "Contractors submit expenses" ON fuel_expenses
  FOR INSERT
  WITH CHECK (
    contractor_id IN (
      SELECT id FROM contractors WHERE clerk_user_id = (auth.jwt() ->> 'sub')
    )
    AND status = 'submitted'
  );

-- Service role has full access (used by API routes and cron)
CREATE POLICY "Service role full access on fuel_expenses" ON fuel_expenses
  FOR ALL
  USING (auth.role() = 'service_role');

-- 8. updated_at triggers for both tables
-- Vehicles trigger
CREATE OR REPLACE FUNCTION update_vehicles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicles_updated_at();

-- Fuel expenses trigger
CREATE OR REPLACE FUNCTION update_fuel_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fuel_expenses_updated_at
  BEFORE UPDATE ON fuel_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_fuel_expenses_updated_at();
