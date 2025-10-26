-- Add approval status to existing materials table
-- This allows us to use the existing materials as approved and add new pending ones

-- 1. Add approval_status column to materials table
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR DEFAULT 'approved' 
CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- 2. Add columns for request tracking
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES contractors(id),
ADD COLUMN IF NOT EXISTS approved_by VARCHAR,
ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS justification TEXT,
ADD COLUMN IF NOT EXISTS project_context VARCHAR,
ADD COLUMN IF NOT EXISTS urgency VARCHAR DEFAULT 'normal' 
CHECK (urgency IN ('low', 'normal', 'high', 'urgent'));

-- 3. Set all existing materials as approved (they're already in the catalog)
UPDATE materials 
SET approval_status = 'approved', 
    approval_date = NOW()
WHERE approval_status IS NULL;

-- 4. Create index for approval status
CREATE INDEX IF NOT EXISTS idx_materials_approval_status ON materials(approval_status);

-- 5. Update RLS policies to support the new workflow
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Materials readable by all authenticated users" ON materials;
DROP POLICY IF EXISTS "Admin can manage materials" ON materials;

-- New policies for approval workflow
-- Everyone can see approved materials (for catalog)
CREATE POLICY "Approved materials readable by all" ON materials 
    FOR SELECT USING (
        approval_status = 'approved' AND is_active = true
    );

-- Contractors can see their own pending/rejected requests
CREATE POLICY "Contractors can view own material requests" ON materials 
    FOR SELECT USING (
        approval_status IN ('pending', 'rejected') AND
        requested_by IN (
            SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

-- Contractors can create new material requests
CREATE POLICY "Contractors can create material requests" ON materials 
    FOR INSERT WITH CHECK (
        approval_status = 'pending' AND
        requested_by IN (
            SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

-- Service role (admin) has full access
CREATE POLICY "Service role has full access to materials" ON materials 
    FOR ALL USING (auth.role() = 'service_role');

-- 6. Add some sample pending materials for testing
-- (These will be visible in admin verification)
-- You can run this manually to test, or skip if not needed

-- Comment: The following INSERT is just for testing - you can uncomment if you want sample pending requests
/*
INSERT INTO materials (
    name, description, category, unit, estimated_price, 
    approval_status, justification, urgency, is_active
) VALUES
('High Performance Concrete Grade M40', 'Ready mix concrete for high-rise construction', 'Concrete', 'cubic meter', 5500.00, 'pending', 'Required for foundation work in Project ABC', 'high', true),
('Stainless Steel Rebar 12mm', 'Corrosion resistant steel bars', 'Steel', 'kg', 95.00, 'pending', 'Needed for coastal construction project', 'normal', true)
ON CONFLICT DO NOTHING;
*/

COMMENT ON COLUMN materials.approval_status IS 'Approval workflow: pending -> approved/rejected';
COMMENT ON COLUMN materials.requested_by IS 'Contractor who requested this material (NULL for original catalog items)';