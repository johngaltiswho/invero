-- Enhanced schema for material mappings with manual editing and one-to-many relationships

-- 1. Create materials master table (if not exists)
CREATE TABLE IF NOT EXISTS materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    category VARCHAR,
    subcategory VARCHAR,
    unit VARCHAR NOT NULL,
    current_price DECIMAL(10,2),
    supplier_info JSONB,
    specifications JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enhanced boq_material_mappings table for one-to-many relationship
CREATE TABLE IF NOT EXISTS boq_material_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL,
    boq_item_id UUID REFERENCES boq_items(id) ON DELETE CASCADE,
    boq_item_description TEXT NOT NULL, -- Keep description for AI-generated mappings without boq_item_id
    material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
    
    -- Quantity and cost calculations
    suggested_quantity DECIMAL(10,2),
    actual_quantity DECIMAL(10,2), -- User can override AI suggestion
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(12,2) GENERATED ALWAYS AS (
        COALESCE(actual_quantity, suggested_quantity) * COALESCE(unit_cost, 0)
    ) STORED,
    
    -- Status tracking
    status VARCHAR DEFAULT 'ai_suggested' CHECK (status IN ('ai_suggested', 'user_modified', 'approved', 'rejected')),
    confidence_score DECIMAL(3,2), -- AI confidence 0.00-1.00
    
    -- User modifications
    modified_by VARCHAR, -- User ID who made changes
    modification_reason TEXT,
    
    -- AI metadata
    ai_reasoning TEXT,
    ai_model_version VARCHAR,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_boq_material_mappings_project_id ON boq_material_mappings(project_id);
CREATE INDEX IF NOT EXISTS idx_boq_material_mappings_boq_item_id ON boq_material_mappings(boq_item_id);
CREATE INDEX IF NOT EXISTS idx_boq_material_mappings_material_id ON boq_material_mappings(material_id);
CREATE INDEX IF NOT EXISTS idx_boq_material_mappings_status ON boq_material_mappings(status);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_active ON materials(is_active);

-- 4. Enable RLS
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE boq_material_mappings ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for materials (read-only for contractors, full access for admin)
CREATE POLICY "Materials readable by all authenticated users" ON materials 
    FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "Admin can manage materials" ON materials 
    FOR ALL USING (auth.role() = 'service_role');

-- 6. RLS Policies for boq_material_mappings (contractors can see their own project mappings)
CREATE POLICY "Contractors can view own project mappings" ON boq_material_mappings 
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM projects p 
            JOIN contractors c ON p.contractor_id = c.id 
            WHERE c.clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Contractors can modify own project mappings" ON boq_material_mappings 
    FOR UPDATE USING (
        project_id IN (
            SELECT p.id FROM projects p 
            JOIN contractors c ON p.contractor_id = c.id 
            WHERE c.clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Service role has full access to mappings" ON boq_material_mappings 
    FOR ALL USING (auth.role() = 'service_role');

-- 7. Add trigger for automatic updated_at timestamp
CREATE TRIGGER update_materials_updated_at 
    BEFORE UPDATE ON materials 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boq_material_mappings_updated_at 
    BEFORE UPDATE ON boq_material_mappings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Create view for enriched material mappings
CREATE VIEW boq_material_mappings_detailed AS
SELECT 
    bmm.*,
    m.name as material_name,
    m.description as material_description,
    m.category as material_category,
    m.unit as material_unit,
    m.current_price as material_current_price,
    bi.description as boq_description,
    bi.unit as boq_unit,
    bi.quantity_text as boq_quantity_text,
    bi.quantity_numeric as boq_quantity_numeric,
    bi.rate as boq_rate,
    bi.amount as boq_amount
FROM boq_material_mappings bmm
LEFT JOIN materials m ON bmm.material_id = m.id
LEFT JOIN boq_items bi ON bmm.boq_item_id = bi.id;

-- 9. Sample materials data (common construction materials)
INSERT INTO materials (name, description, category, subcategory, unit, current_price, is_active) VALUES
('Ordinary Portland Cement (OPC)', '53 Grade OPC cement', 'Cement', 'OPC', 'bag', 425.00, true),
('Portland Pozzolana Cement (PPC)', '53 Grade PPC cement', 'Cement', 'PPC', 'bag', 410.00, true),
('Fine Sand', 'River sand for construction', 'Aggregates', 'Fine Aggregate', 'cft', 45.00, true),
('Coarse Sand', 'Coarse sand for concrete', 'Aggregates', 'Fine Aggregate', 'cft', 50.00, true),
('20mm Aggregate', '20mm crushed stone aggregate', 'Aggregates', 'Coarse Aggregate', 'cft', 55.00, true),
('10mm Aggregate', '10mm crushed stone aggregate', 'Aggregates', 'Coarse Aggregate', 'cft', 58.00, true),
('12mm TMT Steel Bars', 'Fe500 grade TMT bars', 'Steel', 'Reinforcement', 'kg', 72.00, true),
('16mm TMT Steel Bars', 'Fe500 grade TMT bars', 'Steel', 'Reinforcement', 'kg', 71.50, true),
('8mm TMT Steel Bars', 'Fe500 grade TMT bars', 'Steel', 'Reinforcement', 'kg', 73.00, true),
('Binding Wire', 'Mild steel binding wire', 'Steel', 'Accessories', 'kg', 85.00, true),
('Red Clay Bricks', 'Standard size clay bricks', 'Masonry', 'Bricks', 'nos', 8.50, true),
('Fly Ash Bricks', 'AAC fly ash bricks', 'Masonry', 'Bricks', 'nos', 12.00, true),
('Cement Concrete Blocks', 'Hollow concrete blocks', 'Masonry', 'Blocks', 'nos', 45.00, true)
ON CONFLICT DO NOTHING;