-- Enhanced Purchase Orders Schema with Vendor Grouping and Partial Quantities
-- Run this script in your Supabase SQL editor

-- 1. Add quantity tracking columns to materials table
ALTER TABLE materials ADD COLUMN IF NOT EXISTS total_approved_qty DECIMAL(10,2);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS total_requested_qty DECIMAL(10,2) DEFAULT 0;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS remaining_qty DECIMAL(10,2);

-- 2. Create purchase orders table for vendor-grouped orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number VARCHAR UNIQUE NOT NULL, -- PR-001, PR-002, etc.
    project_id UUID NOT NULL,
    vendor_id INTEGER REFERENCES vendors(id),
    contractor_id UUID NOT NULL REFERENCES contractors(id),
    status VARCHAR DEFAULT 'draft' CHECK (status IN (
        'draft',                 -- Being created
        'requested',             -- Submitted to admin
        'admin_review',          -- Under admin review  
        'approved_for_purchase', -- Admin approved
        'quote_received',        -- PI uploaded
        'approved_for_funding',  -- Admin approved funding
        'purchase_completed',    -- Order completed
        'rejected',              -- Admin rejected
        'cancelled'              -- Order cancelled
    )),
    total_estimated_amount DECIMAL(12,2) DEFAULT 0,
    quoted_total DECIMAL(12,2),
    approved_amount DECIMAL(12,2),
    delivery_date DATE,
    delivery_address TEXT,
    contractor_notes TEXT,
    admin_notes TEXT,
    pr_pdf_url TEXT,           -- Generated Purchase Request PDF
    pi_file_url TEXT,          -- Uploaded Proforma Invoice
    requested_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create purchase order items table for line items
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id),
    requested_quantity DECIMAL(10,2) NOT NULL,
    estimated_rate DECIMAL(10,2) DEFAULT 0,
    quoted_rate DECIMAL(10,2),
    line_total DECIMAL(12,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS purchase_order_seq START 1;

-- 5. Create function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR AS $$
BEGIN
    RETURN 'PR-' || LPAD(nextval('purchase_order_seq')::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to update material quantities
CREATE OR REPLACE FUNCTION update_material_quantities()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total_requested_qty for the material
    UPDATE materials SET 
        total_requested_qty = (
            SELECT COALESCE(SUM(poi.requested_quantity), 0)
            FROM purchase_order_items poi
            JOIN purchase_orders po ON poi.purchase_order_id = po.id
            WHERE poi.material_id = NEW.material_id 
            AND po.status != 'cancelled'
        ),
        remaining_qty = total_approved_qty - COALESCE((
            SELECT SUM(poi.requested_quantity)
            FROM purchase_order_items poi
            JOIN purchase_orders po ON poi.purchase_order_id = po.id
            WHERE poi.material_id = NEW.material_id 
            AND po.status != 'cancelled'
        ), 0)
    WHERE id = NEW.material_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create triggers
CREATE TRIGGER update_material_qty_on_insert
    AFTER INSERT ON purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION update_material_quantities();

CREATE TRIGGER update_material_qty_on_update
    AFTER UPDATE ON purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION update_material_quantities();

CREATE TRIGGER update_material_qty_on_delete
    AFTER DELETE ON purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION update_material_quantities();

-- 8. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_project ON purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_contractor ON purchase_orders(contractor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_material ON purchase_order_items(material_id);

-- 9. Add RLS policies
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Contractors can only see their own purchase orders
CREATE POLICY "Contractors can view own purchase orders" ON purchase_orders
    FOR SELECT USING (contractor_id IN (
        SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
    ));

CREATE POLICY "Contractors can create purchase orders" ON purchase_orders
    FOR INSERT WITH CHECK (contractor_id IN (
        SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
    ));

CREATE POLICY "Contractors can update own purchase orders" ON purchase_orders
    FOR UPDATE USING (contractor_id IN (
        SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
    ));

-- Service role has full access
CREATE POLICY "Service role has full purchase orders access" ON purchase_orders
    FOR ALL USING (auth.role() = 'service_role');

-- Purchase order items policies
CREATE POLICY "Users can view items for accessible orders" ON purchase_order_items
    FOR SELECT USING (purchase_order_id IN (
        SELECT id FROM purchase_orders WHERE contractor_id IN (
            SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    ));

CREATE POLICY "Service role has full items access" ON purchase_order_items
    FOR ALL USING (auth.role() = 'service_role');

-- 10. Initialize total_approved_qty for existing materials
-- Set total_approved_qty to current purchase_quantity where it exists
UPDATE materials 
SET total_approved_qty = COALESCE(purchase_quantity, 0),
    remaining_qty = COALESCE(purchase_quantity, 0) - COALESCE(total_requested_qty, 0)
WHERE total_approved_qty IS NULL;

-- 11. Create updated_at trigger for purchase_orders
CREATE TRIGGER update_purchase_orders_updated_at 
    BEFORE UPDATE ON purchase_orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();