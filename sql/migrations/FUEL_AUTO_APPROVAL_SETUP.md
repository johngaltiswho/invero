# Fuel Auto-Approval System Setup Guide

This guide explains how to set up the fuel auto-approval system database schema.

## Prerequisites

- Existing fuel tracking MVP must be installed (add-fuel-tracking-mvp.sql)
- Contractors table must exist
- Supabase project with appropriate permissions

## Migration Files (Apply in Order)

### 1. Core Fuel Tracking (Already Applied)
```
add-fuel-tracking-mvp.sql
```
Creates:
- `vehicles` table
- `fuel_expenses` table
- `fuel_expense_status` enum

### 2. Auto-Approval System (New)
```
add-fuel-auto-approval-system.sql
```
Creates:
- `fuel_pumps` table - Partner fuel stations
- `contractor_fuel_settings` table - Auto-approval rules and limits
- `contractor_approved_pumps` table - Approved pump list per contractor
- `fuel_approvals` table - Approval codes and tracking
- `approval_status` enum
- Auto-generate approval code function (FA-DDMMYY-NNNN)
- Validation function to check if code is valid

### 3. Seed Data (Optional - for testing)
```
seed-fuel-auto-approval-data.sql
```
Creates:
- 5 sample fuel pumps in Bangalore area
- Default settings for all approved contractors
- Approves all pumps for all contractors (MVP testing only)

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy contents of `add-fuel-auto-approval-system.sql`
4. Paste and execute
5. Repeat for `seed-fuel-auto-approval-data.sql` (if testing)

### Option 2: Supabase CLI
```bash
# Connect to your project
supabase db remote connect

# Apply migration
psql -h <your-db-host> -U postgres -d postgres -f sql/migrations/add-fuel-auto-approval-system.sql

# Apply seed data
psql -h <your-db-host> -U postgres -d postgres -f sql/migrations/seed-fuel-auto-approval-data.sql
```

### Option 3: Direct SQL (if using local Supabase)
```bash
supabase db reset
# Migrations will auto-apply if in supabase/migrations/ folder
```

## Verification

After applying migrations, run this query to verify:

```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'fuel_pumps',
    'contractor_fuel_settings',
    'contractor_approved_pumps',
    'fuel_approvals'
  );

-- Check seed data (if applied)
SELECT 'Fuel Pumps' AS table_name, COUNT(*) AS count
FROM fuel_pumps WHERE is_active = true
UNION ALL
SELECT 'Contractor Settings', COUNT(*)
FROM contractor_fuel_settings
UNION ALL
SELECT 'Approved Pumps', COUNT(*)
FROM contractor_approved_pumps WHERE is_active = true;

-- Test approval code generation
INSERT INTO fuel_approvals (
  vehicle_id,
  contractor_id,
  pump_id,
  max_amount,
  max_liters,
  valid_until
) VALUES (
  (SELECT id FROM vehicles LIMIT 1),
  (SELECT id FROM contractors LIMIT 1),
  (SELECT id FROM fuel_pumps LIMIT 1),
  5000,
  50,
  NOW() + INTERVAL '24 hours'
) RETURNING approval_code;
-- Should return something like: FA-260320-0001
```

## What Each Table Does

### fuel_pumps
Stores partnered fuel stations where contractors can fill fuel.
- Admin manages this list
- Contractors can only see active pumps

### contractor_fuel_settings
Defines auto-approval rules for each contractor:
- `monthly_fuel_budget`: Rs 50,000 (default)
- `per_request_max_amount`: Rs 10,000 (default)
- `per_request_max_liters`: 100L (default)
- `max_fills_per_vehicle_per_day`: 1 (default)
- `min_hours_between_fills`: 12 hours (default)
- `auto_approve_enabled`: true/false toggle

### contractor_approved_pumps
Many-to-many relationship - which pumps each contractor is allowed to use.
- Prevents contractors from using unauthorized pumps
- Admin controls this whitelist

### fuel_approvals
Core table for the auto-approval workflow:
1. Contractor requests fuel → auto-approval checks rules
2. If approved → unique code generated (e.g., FA-260320-0001)
3. Code shared with driver
4. Pump owner validates code in dashboard
5. Fuel filled → pump updates status to 'filled'

## Approval Code Format

**Format**: `FA-DDMMYY-NNNN`

**Example**: `FA-260320-0001`
- `FA`: Fuel Approval prefix
- `260320`: Date (26th March 2020)
- `0001`: Sequential number for that day

## Security (RLS Policies)

All tables have Row Level Security enabled:
- Contractors can only view their own data
- Pump owners will have separate policies (to be added)
- Service role (API) has full access
- Admins manage via service role

## Next Steps

After migrations are applied:
1. Create contractor request API (`POST /api/contractor/fuel-requests`)
2. Implement auto-approval validation logic
3. Create pump owner dashboard
4. Create contractor UI for requesting fuel
5. Test end-to-end workflow

## Default Settings Reference

If you want to customize defaults, modify these values in the migration:

```sql
-- In contractor_fuel_settings defaults:
monthly_fuel_budget DECIMAL(10,2) NOT NULL DEFAULT 50000,
per_request_max_amount DECIMAL(10,2) NOT NULL DEFAULT 10000,
per_request_max_liters DECIMAL(10,2) NOT NULL DEFAULT 100,
max_fills_per_vehicle_per_day INT NOT NULL DEFAULT 1,
min_hours_between_fills INT NOT NULL DEFAULT 12,
auto_approve_enabled BOOLEAN DEFAULT true
```

## Rollback (if needed)

To rollback this migration:

```sql
DROP TABLE IF EXISTS fuel_approvals CASCADE;
DROP TABLE IF EXISTS contractor_approved_pumps CASCADE;
DROP TABLE IF EXISTS contractor_fuel_settings CASCADE;
DROP TABLE IF EXISTS fuel_pumps CASCADE;
DROP TYPE IF EXISTS approval_status;
DROP SEQUENCE IF EXISTS fuel_approval_sequence;
DROP FUNCTION IF EXISTS generate_fuel_approval_code();
DROP FUNCTION IF EXISTS set_fuel_approval_code();
DROP FUNCTION IF EXISTS is_approval_code_valid(VARCHAR);
```
