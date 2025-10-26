-- Optimized Purchase Request Schema - Extending Existing Materials Table
-- Instead of creating new tables, we'll add purchase workflow to existing materials flow

-- 1. Add purchase request columns to existing materials table
ALTER TABLE materials ADD COLUMN IF NOT EXISTS purchase_status VARCHAR DEFAULT 'none' CHECK (purchase_status IN (
    'none',                  -- Material approved but not yet requested for purchase
    'purchase_requested',    -- Contractor requested purchase with vendor
    'admin_review',          -- Under admin review
    'approved_for_purchase', -- Approved for procurement
    'vendor_contacted',      -- PDF sent to vendor
    'quote_received',        -- Quote uploaded by contractor
    'quote_under_review',    -- Quote under admin review
    'approved_for_funding',  -- Approved for fund disbursement
    'funds_disbursed',       -- Funds released
    'purchase_completed',    -- Purchase completed
    'rejected',              -- Purchase request rejected
    'cancelled'              -- Purchase request cancelled
));

ALTER TABLE materials ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS purchase_quantity DECIMAL(10,2); -- Quantity for this purchase
ALTER TABLE materials ADD COLUMN IF NOT EXISTS estimated_rate DECIMAL(10,2);   -- Rate for this purchase
ALTER TABLE materials ADD COLUMN IF NOT EXISTS quoted_rate DECIMAL(10,2);      -- Vendor quoted rate
ALTER TABLE materials ADD COLUMN IF NOT EXISTS quoted_total DECIMAL(12,2);     -- Total quote amount
ALTER TABLE materials ADD COLUMN IF NOT EXISTS approved_amount DECIMAL(12,2);  -- Admin approved amount
ALTER TABLE materials ADD COLUMN IF NOT EXISTS delivery_date DATE;             -- Requested delivery date
ALTER TABLE materials ADD COLUMN IF NOT EXISTS delivery_address TEXT;          -- Delivery location
ALTER TABLE materials ADD COLUMN IF NOT EXISTS contractor_notes TEXT;          -- Purchase request notes
ALTER TABLE materials ADD COLUMN IF NOT EXISTS admin_purchase_notes TEXT;      -- Admin notes for purchase
ALTER TABLE materials ADD COLUMN IF NOT EXISTS vendor_pdf_url TEXT;            -- Generated PDF for vendor
ALTER TABLE materials ADD COLUMN IF NOT EXISTS quote_file_url TEXT;            -- Uploaded quote file
ALTER TABLE materials ADD COLUMN IF NOT EXISTS purchase_requested_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS purchase_approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS purchase_completed_at TIMESTAMP WITH TIME ZONE;

-- 2. Create simplified vendors table (reuse from previous schema)
CREATE TABLE IF NOT EXISTS vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name VARCHAR NOT NULL,
    contact_person VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    address TEXT,
    gst_number VARCHAR,
    pan_number VARCHAR,
    verification_status VARCHAR DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_by UUID,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create purchase status history table for tracking
CREATE TABLE IF NOT EXISTS material_purchase_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    from_status VARCHAR,
    to_status VARCHAR NOT NULL,
    changed_by UUID,
    change_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_materials_purchase_status ON materials(purchase_status);
CREATE INDEX IF NOT EXISTS idx_materials_vendor_id ON materials(vendor_id);
CREATE INDEX IF NOT EXISTS idx_materials_approval_purchase ON materials(approval_status, purchase_status);
CREATE INDEX IF NOT EXISTS idx_vendors_verification ON vendors(verification_status);
CREATE INDEX IF NOT EXISTS idx_purchase_history_material ON material_purchase_history(material_id);

-- 5. Create function to track purchase status changes
CREATE OR REPLACE FUNCTION track_material_purchase_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only track if purchase_status changed
    IF OLD.purchase_status IS DISTINCT FROM NEW.purchase_status THEN
        INSERT INTO material_purchase_history (
            material_id,
            from_status,
            to_status,
            changed_by,
            change_reason
        ) VALUES (
            NEW.id,
            OLD.purchase_status,
            NEW.purchase_status,
            NEW.updated_by, -- This should be set by the application
            NEW.status_change_reason -- This should be set by the application
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for status tracking
DROP TRIGGER IF EXISTS material_purchase_status_history ON materials;
CREATE TRIGGER material_purchase_status_history 
    AFTER UPDATE ON materials
    FOR EACH ROW EXECUTE FUNCTION track_material_purchase_status_change();

-- 7. Update existing triggers
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: Vendors will be added through the admin interface as needed

-- 9. Add RLS policies for new columns
-- Vendors policies
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view verified vendors" ON vendors 
    FOR SELECT USING (verification_status = 'verified');

CREATE POLICY "Service role has full vendor access" ON vendors 
    FOR ALL USING (auth.role() = 'service_role');

-- Material purchase history policies  
ALTER TABLE material_purchase_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history for accessible materials" ON material_purchase_history 
    FOR SELECT USING (material_id IN (
        SELECT id FROM materials WHERE requested_by IN (
            SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    ));

CREATE POLICY "Service role has full history access" ON material_purchase_history 
    FOR ALL USING (auth.role() = 'service_role');

-- 10. Create view for purchase requests (backward compatibility)
CREATE OR REPLACE VIEW purchase_requests AS
SELECT 
    m.id,
    m.project_context as project_id,
    m.requested_by as contractor_id,
    m.vendor_id,
    m.purchase_status as status,
    m.purchase_quantity * m.estimated_rate as estimated_total,
    m.quoted_total,
    m.approved_amount,
    m.delivery_date,
    m.delivery_address,
    m.contractor_notes,
    m.admin_purchase_notes as admin_notes,
    m.vendor_pdf_url,
    m.quote_file_url,
    m.purchase_requested_at as created_at,
    m.purchase_approved_at as approved_at,
    m.purchase_completed_at as completed_at,
    -- Join vendor info
    v.company_name as vendor_company_name,
    v.contact_person as vendor_contact_person,
    v.email as vendor_email,
    v.phone as vendor_phone,
    -- Join contractor info
    c.company_name as contractor_company_name,
    c.contact_person as contractor_contact_person,
    c.email as contractor_email,
    -- Material info as "items"
    json_build_array(
        json_build_object(
            'id', m.id,
            'item_name', m.name,
            'item_description', m.description,
            'unit', m.unit,
            'quantity', m.purchase_quantity,
            'estimated_rate', m.estimated_rate,
            'quoted_rate', m.quoted_rate,
            'selected_for_order', true
        )
    ) as purchase_request_items
FROM materials m
LEFT JOIN vendors v ON m.vendor_id = v.id
LEFT JOIN contractors c ON m.requested_by = c.id
WHERE m.purchase_status != 'none' AND m.approval_status = 'approved';