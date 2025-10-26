-- Update Materials Master Table to better separate catalog from pricing

-- 1. Make current_price optional in materials table (it can be a reference price)
ALTER TABLE materials 
  ALTER COLUMN current_price DROP NOT NULL,
  ADD COLUMN reference_price DECIMAL(10,2), -- Optional reference/market price
  ADD COLUMN price_updated_at TIMESTAMP WITH TIME ZONE;

-- Add comment to clarify the purpose
COMMENT ON COLUMN materials.current_price IS 'Optional reference price for estimation purposes only';
COMMENT ON COLUMN materials.reference_price IS 'Market reference price (not for actual procurement)';

-- 2. Create a separate table for actual material purchases/procurement
CREATE TABLE material_purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id),
    material_id UUID NOT NULL REFERENCES materials(id),
    supplier_name VARCHAR NOT NULL,
    supplier_contact TEXT,
    
    -- Purchase details
    quantity_ordered DECIMAL(10,2) NOT NULL,
    quantity_received DECIMAL(10,2) DEFAULT 0,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(12,2) GENERATED ALWAYS AS (quantity_ordered * unit_price) STORED,
    
    -- Purchase status
    status VARCHAR DEFAULT 'ordered' CHECK (status IN ('ordered', 'partial', 'delivered', 'cancelled')),
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery DATE,
    actual_delivery DATE,
    
    -- Purchase metadata
    purchase_order_number VARCHAR,
    invoice_number VARCHAR,
    invoice_amount DECIMAL(12,2),
    
    -- Quality and compliance
    quality_check_status VARCHAR CHECK (quality_check_status IN ('pending', 'passed', 'failed', 'not_required')),
    quality_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for purchase tracking
CREATE INDEX idx_material_purchases_project_id ON material_purchases(project_id);
CREATE INDEX idx_material_purchases_material_id ON material_purchases(material_id);
CREATE INDEX idx_material_purchases_status ON material_purchases(status);
CREATE INDEX idx_material_purchases_order_date ON material_purchases(order_date);

-- 4. Enable RLS for purchases
ALTER TABLE material_purchases ENABLE ROW LEVEL SECURITY;

-- Contractors can only see their own project purchases
CREATE POLICY "Contractors can view own project purchases" ON material_purchases 
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM projects p 
            JOIN contractors c ON p.contractor_id = c.id 
            WHERE c.clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

-- Contractors can manage their own project purchases
CREATE POLICY "Contractors can manage own project purchases" ON material_purchases 
    FOR ALL USING (
        project_id IN (
            SELECT p.id FROM projects p 
            JOIN contractors c ON p.contractor_id = c.id 
            WHERE c.clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

-- Service role has full access
CREATE POLICY "Service role has full access to purchases" ON material_purchases 
    FOR ALL USING (auth.role() = 'service_role');

-- 5. Add trigger for updated_at
CREATE TRIGGER update_material_purchases_updated_at 
    BEFORE UPDATE ON material_purchases 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Create view for purchase summary by project
CREATE VIEW project_material_summary AS
SELECT 
    p.id as project_id,
    p.project_name,
    COUNT(DISTINCT mp.material_id) as unique_materials_ordered,
    COUNT(mp.id) as total_purchase_orders,
    SUM(mp.total_amount) as total_material_cost,
    SUM(CASE WHEN mp.status = 'delivered' THEN mp.total_amount ELSE 0 END) as delivered_value,
    SUM(CASE WHEN mp.status IN ('ordered', 'partial') THEN mp.total_amount ELSE 0 END) as pending_value,
    AVG(CASE WHEN mp.actual_delivery IS NOT NULL AND mp.expected_delivery IS NOT NULL 
        THEN mp.actual_delivery - mp.expected_delivery ELSE NULL END) as avg_delivery_delay_days
FROM projects p
LEFT JOIN material_purchases mp ON p.id = mp.project_id
GROUP BY p.id, p.project_name;

-- 7. Create view for material usage across projects (for master data insights)
CREATE VIEW material_usage_analytics AS
SELECT 
    m.id as material_id,
    m.name as material_name,
    m.category,
    COUNT(DISTINCT mp.project_id) as projects_using,
    COUNT(mp.id) as total_purchases,
    SUM(mp.quantity_ordered) as total_quantity_ordered,
    SUM(mp.quantity_received) as total_quantity_received,
    AVG(mp.unit_price) as avg_unit_price,
    MIN(mp.unit_price) as min_unit_price,
    MAX(mp.unit_price) as max_unit_price,
    -- Price trend (latest vs earliest purchase)
    (SELECT mp2.unit_price FROM material_purchases mp2 
     WHERE mp2.material_id = m.id 
     ORDER BY mp2.order_date DESC LIMIT 1) as latest_price,
    (SELECT mp2.unit_price FROM material_purchases mp2 
     WHERE mp2.material_id = m.id 
     ORDER BY mp2.order_date ASC LIMIT 1) as earliest_price
FROM materials m
LEFT JOIN material_purchases mp ON m.id = mp.material_id
WHERE m.is_active = true
GROUP BY m.id, m.name, m.category;

-- 8. Sample data for testing
INSERT INTO material_purchases (
    project_id, material_id, supplier_name, quantity_ordered, unit_price, 
    order_date, expected_delivery, status
) VALUES
    -- These would use actual project and material IDs from your database
    ('sample-project-id', 'sample-material-id', 'ABC Suppliers', 100.00, 425.00, 
     CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 'ordered')
ON CONFLICT DO NOTHING;

-- 9. Update the existing materials table description
COMMENT ON TABLE materials IS 'Master catalog of available construction materials - specifications only, not for procurement pricing';
COMMENT ON TABLE material_purchases IS 'Actual material procurement and purchase tracking per project';
COMMENT ON TABLE boq_material_mappings IS 'Links BOQ items to materials with estimated quantities and costs for planning';