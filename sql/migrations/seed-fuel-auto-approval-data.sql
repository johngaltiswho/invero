-- Seed data for fuel auto-approval system
-- Run this after add-fuel-auto-approval-system.sql
-- This creates sample fuel pumps and default settings for testing

-- 1. Insert sample fuel pump partners (Bangalore area examples)
INSERT INTO fuel_pumps (pump_name, address, city, state, pincode, contact_person, contact_phone, contact_email, is_active)
VALUES
  (
    'Indian Oil Petrol Pump - Koramangala',
    '123, 80 Feet Road, Koramangala 4th Block',
    'Bangalore',
    'Karnataka',
    '560034',
    'Rajesh Kumar',
    '9876543210',
    'koramangala@indianoil.in',
    true
  ),
  (
    'HP Petrol Pump - Whitefield',
    '456, ITPL Main Road, Whitefield',
    'Bangalore',
    'Karnataka',
    '560066',
    'Sunita Sharma',
    '9876543211',
    'whitefield@hpcl.co.in',
    true
  ),
  (
    'Bharat Petroleum - Electronic City',
    '789, Hosur Road, Electronic City Phase 1',
    'Bangalore',
    'Karnataka',
    '560100',
    'Amit Patel',
    '9876543212',
    'ecity@bharatpetroleum.in',
    true
  ),
  (
    'Shell Petrol Station - Sarjapur Road',
    '321, Sarjapur Main Road, Near Wipro Campus',
    'Bangalore',
    'Karnataka',
    '560035',
    'Priya Menon',
    '9876543213',
    'sarjapur@shell.co.in',
    true
  ),
  (
    'Reliance Petrol Pump - Hennur Road',
    '654, Hennur Main Road, Kalyan Nagar',
    'Bangalore',
    'Karnataka',
    '560043',
    'Vikram Singh',
    '9876543214',
    'hennur@ril.com',
    true
  )
ON CONFLICT DO NOTHING;

-- 2. Create default fuel settings for all existing contractors
-- This will apply default limits to any contractors who don't already have settings
INSERT INTO contractor_fuel_settings (
  contractor_id,
  monthly_fuel_budget,
  per_request_max_amount,
  per_request_max_liters,
  max_fills_per_vehicle_per_day,
  min_hours_between_fills,
  auto_approve_enabled
)
SELECT
  id AS contractor_id,
  50000 AS monthly_fuel_budget,          -- Rs 50,000 per month
  10000 AS per_request_max_amount,       -- Rs 10,000 per request
  100 AS per_request_max_liters,         -- 100 liters per request
  1 AS max_fills_per_vehicle_per_day,    -- 1 fill per vehicle per day
  12 AS min_hours_between_fills,         -- 12 hours between fills
  true AS auto_approve_enabled           -- Auto-approval ON by default
FROM contractors
WHERE id NOT IN (SELECT contractor_id FROM contractor_fuel_settings)
  AND status = 'approved';

-- 3. Approve all fuel pumps for all contractors (for MVP testing)
-- In production, admin would selectively approve pumps per contractor
INSERT INTO contractor_approved_pumps (contractor_id, pump_id, is_active)
SELECT
  c.id AS contractor_id,
  fp.id AS pump_id,
  true AS is_active
FROM contractors c
CROSS JOIN fuel_pumps fp
WHERE c.status = 'approved'
  AND fp.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM contractor_approved_pumps cap
    WHERE cap.contractor_id = c.id
      AND cap.pump_id = fp.id
  )
ON CONFLICT (contractor_id, pump_id) DO NOTHING;

-- 4. Helper query to verify seed data
-- Run this to check what was created:
-- SELECT 'Fuel Pumps' AS table_name, COUNT(*) AS count FROM fuel_pumps WHERE is_active = true
-- UNION ALL
-- SELECT 'Contractor Settings', COUNT(*) FROM contractor_fuel_settings
-- UNION ALL
-- SELECT 'Approved Pumps', COUNT(*) FROM contractor_approved_pumps WHERE is_active = true;
