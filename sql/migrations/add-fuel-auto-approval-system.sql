-- Migration: Add fuel auto-approval system with unique approval codes
-- This extends the existing fuel tracking MVP with contractor self-service and pump partner integration
-- Run this against your Supabase database after add-fuel-tracking-mvp.sql

-- 1. Create fuel_pumps table (partnered fuel stations)
CREATE TABLE IF NOT EXISTS fuel_pumps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pump_name VARCHAR(200) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  pincode VARCHAR(10),
  contact_person VARCHAR(100),
  contact_phone VARCHAR(15),
  contact_email VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create contractor_fuel_settings table (auto-approval rules)
CREATE TABLE IF NOT EXISTS contractor_fuel_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID NOT NULL UNIQUE REFERENCES contractors(id) ON DELETE CASCADE,

  -- Budget limits
  monthly_fuel_budget DECIMAL(10,2) NOT NULL DEFAULT 50000,

  -- Per-request limits
  per_request_max_amount DECIMAL(10,2) NOT NULL DEFAULT 10000,
  per_request_max_liters DECIMAL(10,2) NOT NULL DEFAULT 100,

  -- Frequency limits
  max_fills_per_vehicle_per_day INT NOT NULL DEFAULT 1,
  min_hours_between_fills INT NOT NULL DEFAULT 12,

  -- Auto-approval toggle
  auto_approve_enabled BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create contractor_approved_pumps table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS contractor_approved_pumps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  pump_id UUID NOT NULL REFERENCES fuel_pumps(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique contractor-pump pairs
  UNIQUE(contractor_id, pump_id)
);

-- 4. Create approval_status enum
DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM (
    'pending',    -- Approval issued, waiting for fuel fill
    'filled',     -- Fuel filled and logged by pump
    'expired',    -- Approval expired (not used within validity period)
    'cancelled'   -- Cancelled by contractor/admin
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 5. Create fuel_approvals table (with unique approval codes)
CREATE TABLE IF NOT EXISTS fuel_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Unique approval code (e.g., FA-260320-0001)
  approval_code VARCHAR(50) NOT NULL UNIQUE,

  -- References
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  pump_id UUID NOT NULL REFERENCES fuel_pumps(id) ON DELETE CASCADE,

  -- Approval limits
  max_amount DECIMAL(10,2) NOT NULL,
  max_liters DECIMAL(10,2) NOT NULL,

  -- Validity period
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Status tracking
  status approval_status DEFAULT 'pending',

  -- Request metadata
  request_type VARCHAR(20) DEFAULT 'contractor_requested', -- future: emergency, admin_override
  auto_approved BOOLEAN DEFAULT false,
  requested_notes TEXT,

  -- Fill tracking (populated by pump when fuel is filled)
  filled_at TIMESTAMP WITH TIME ZONE,
  filled_quantity DECIMAL(10,2),
  filled_amount DECIMAL(10,2),
  pump_notes TEXT,

  -- Approval metadata
  approved_by UUID, -- References users table (nullable for auto-approvals)
  approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create approval code sequence and generator function
CREATE SEQUENCE IF NOT EXISTS fuel_approval_sequence START 1;

CREATE OR REPLACE FUNCTION generate_fuel_approval_code()
RETURNS VARCHAR(50) AS $$
DECLARE
  date_part VARCHAR(6);
  sequence_num VARCHAR(4);
  new_code VARCHAR(50);
BEGIN
  -- Format: FA-DDMMYY-NNNN (e.g., FA-260320-0001)
  date_part := TO_CHAR(CURRENT_DATE, 'DDMMYY');
  sequence_num := LPAD(nextval('fuel_approval_sequence')::TEXT, 4, '0');
  new_code := 'FA-' || date_part || '-' || sequence_num;

  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger to auto-generate approval code on insert
CREATE OR REPLACE FUNCTION set_fuel_approval_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approval_code IS NULL OR NEW.approval_code = '' THEN
    NEW.approval_code := generate_fuel_approval_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fuel_approvals_set_code
  BEFORE INSERT ON fuel_approvals
  FOR EACH ROW
  EXECUTE FUNCTION set_fuel_approval_code();

-- 8. Indexes for common query patterns
-- Fuel pumps indexes
CREATE INDEX IF NOT EXISTS idx_fuel_pumps_active ON fuel_pumps(is_active);
CREATE INDEX IF NOT EXISTS idx_fuel_pumps_city ON fuel_pumps(city) WHERE is_active = true;

-- Contractor fuel settings indexes
CREATE INDEX IF NOT EXISTS idx_fuel_settings_contractor ON contractor_fuel_settings(contractor_id);

-- Contractor approved pumps indexes
CREATE INDEX IF NOT EXISTS idx_approved_pumps_contractor ON contractor_approved_pumps(contractor_id);
CREATE INDEX IF NOT EXISTS idx_approved_pumps_pump ON contractor_approved_pumps(pump_id);
CREATE INDEX IF NOT EXISTS idx_approved_pumps_active ON contractor_approved_pumps(contractor_id, pump_id) WHERE is_active = true;

-- Fuel approvals indexes
CREATE INDEX IF NOT EXISTS idx_fuel_approvals_code ON fuel_approvals(approval_code);
CREATE INDEX IF NOT EXISTS idx_fuel_approvals_contractor ON fuel_approvals(contractor_id);
CREATE INDEX IF NOT EXISTS idx_fuel_approvals_vehicle ON fuel_approvals(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_approvals_pump ON fuel_approvals(pump_id);
CREATE INDEX IF NOT EXISTS idx_fuel_approvals_status ON fuel_approvals(status);
CREATE INDEX IF NOT EXISTS idx_fuel_approvals_validity ON fuel_approvals(valid_until) WHERE status = 'pending';

-- 9. Enable RLS on all new tables
ALTER TABLE fuel_pumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_fuel_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_approved_pumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_approvals ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies for fuel_pumps
-- All authenticated users can view active pumps (for selecting during request)
CREATE POLICY "Authenticated users view active pumps" ON fuel_pumps
  FOR SELECT
  USING (is_active = true);

-- Service role has full access
CREATE POLICY "Service role full access on fuel_pumps" ON fuel_pumps
  FOR ALL
  USING (auth.role() = 'service_role');

-- 11. RLS Policies for contractor_fuel_settings
-- Contractors can view their own settings
CREATE POLICY "Contractors view own fuel settings" ON contractor_fuel_settings
  FOR SELECT
  USING (
    contractor_id IN (
      SELECT id FROM contractors WHERE clerk_user_id = (auth.jwt() ->> 'sub')
    )
  );

-- Service role has full access (admin manages settings)
CREATE POLICY "Service role full access on fuel settings" ON contractor_fuel_settings
  FOR ALL
  USING (auth.role() = 'service_role');

-- 12. RLS Policies for contractor_approved_pumps
-- Contractors can view their approved pumps
CREATE POLICY "Contractors view own approved pumps" ON contractor_approved_pumps
  FOR SELECT
  USING (
    contractor_id IN (
      SELECT id FROM contractors WHERE clerk_user_id = (auth.jwt() ->> 'sub')
    )
  );

-- Service role has full access
CREATE POLICY "Service role full access on approved pumps" ON contractor_approved_pumps
  FOR ALL
  USING (auth.role() = 'service_role');

-- 13. RLS Policies for fuel_approvals
-- Contractors can view their own approvals
CREATE POLICY "Contractors view own approvals" ON fuel_approvals
  FOR SELECT
  USING (
    contractor_id IN (
      SELECT id FROM contractors WHERE clerk_user_id = (auth.jwt() ->> 'sub')
    )
  );

-- Contractors can create approvals (INSERT will be validated by API)
CREATE POLICY "Contractors create approvals" ON fuel_approvals
  FOR INSERT
  WITH CHECK (
    contractor_id IN (
      SELECT id FROM contractors WHERE clerk_user_id = (auth.jwt() ->> 'sub')
    )
  );

-- Service role has full access
CREATE POLICY "Service role full access on fuel approvals" ON fuel_approvals
  FOR ALL
  USING (auth.role() = 'service_role');

-- 14. updated_at triggers for all new tables
-- Fuel pumps trigger
CREATE OR REPLACE FUNCTION update_fuel_pumps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fuel_pumps_updated_at
  BEFORE UPDATE ON fuel_pumps
  FOR EACH ROW
  EXECUTE FUNCTION update_fuel_pumps_updated_at();

-- Contractor fuel settings trigger
CREATE OR REPLACE FUNCTION update_fuel_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fuel_settings_updated_at
  BEFORE UPDATE ON contractor_fuel_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_fuel_settings_updated_at();

-- Contractor approved pumps trigger
CREATE OR REPLACE FUNCTION update_approved_pumps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER approved_pumps_updated_at
  BEFORE UPDATE ON contractor_approved_pumps
  FOR EACH ROW
  EXECUTE FUNCTION update_approved_pumps_updated_at();

-- Fuel approvals trigger
CREATE OR REPLACE FUNCTION update_fuel_approvals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fuel_approvals_updated_at
  BEFORE UPDATE ON fuel_approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_fuel_approvals_updated_at();

-- 15. Function to check if approval code is valid for filling
CREATE OR REPLACE FUNCTION is_approval_code_valid(code VARCHAR(50))
RETURNS TABLE (
  is_valid BOOLEAN,
  approval_id UUID,
  vehicle_number VARCHAR(20),
  max_amount DECIMAL(10,2),
  max_liters DECIMAL(10,2),
  contractor_name VARCHAR(200),
  message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN fa.id IS NULL THEN false
      WHEN fa.status != 'pending' THEN false
      WHEN fa.valid_until < NOW() THEN false
      ELSE true
    END AS is_valid,
    fa.id AS approval_id,
    v.vehicle_number,
    fa.max_amount,
    fa.max_liters,
    c.company_name AS contractor_name,
    CASE
      WHEN fa.id IS NULL THEN 'Invalid approval code'
      WHEN fa.status != 'pending' THEN 'Approval already used or cancelled'
      WHEN fa.valid_until < NOW() THEN 'Approval expired'
      ELSE 'Valid approval'
    END AS message
  FROM fuel_approvals fa
  LEFT JOIN vehicles v ON fa.vehicle_id = v.id
  LEFT JOIN contractors c ON fa.contractor_id = c.id
  WHERE fa.approval_code = code
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
