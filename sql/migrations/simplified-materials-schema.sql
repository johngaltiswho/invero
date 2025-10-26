-- Simplified Materials Schema with Approval Status and Nomenclature
-- Single table approach - contractors request materials, admins approve them

-- 1. Materials table with approval status
CREATE TABLE IF NOT EXISTS materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Material identification with nomenclature
    material_code VARCHAR UNIQUE, -- System-generated code (e.g., CEM-OPC-53-001)
    name VARCHAR NOT NULL, -- Standardized name following nomenclature
    description TEXT,
    
    -- Classification following nomenclature
    category VARCHAR NOT NULL, -- Main category (CEM, AGG, STL, MAS, etc.)
    subcategory VARCHAR, -- Sub-classification
    brand VARCHAR, -- Brand name if applicable
    grade_specification VARCHAR, -- Grade/specification (53, Fe500, etc.)
    
    -- Technical details
    unit VARCHAR NOT NULL,
    estimated_price DECIMAL(10,2), -- Reference price for estimation
    supplier_info JSONB,
    specifications JSONB,
    
    -- Request and approval workflow
    approval_status VARCHAR DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    requested_by UUID REFERENCES contractors(id), -- Who requested this material
    approved_by VARCHAR, -- Admin who approved/rejected
    approval_date TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Request context
    justification TEXT, -- Why this material was requested
    project_context VARCHAR, -- Which project needed this
    urgency VARCHAR DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Material nomenclature reference table
CREATE TABLE IF NOT EXISTS material_categories (
    code VARCHAR PRIMARY KEY, -- 3-letter code (CEM, AGG, STL, etc.)
    name VARCHAR NOT NULL, -- Full category name
    description TEXT,
    naming_pattern VARCHAR, -- Pattern for material codes in this category
    active BOOLEAN DEFAULT true
);

-- 3. Insert standard categories with nomenclature
INSERT INTO material_categories (code, name, description, naming_pattern) VALUES
('CEM', 'Cement', 'All types of cement', 'CEM-{TYPE}-{GRADE}-{###}'),
('AGG', 'Aggregates', 'Sand, gravel, crushed stone', 'AGG-{TYPE}-{SIZE}-{###}'),
('STL', 'Steel', 'Reinforcement bars, structural steel', 'STL-{TYPE}-{SIZE}-{###}'),
('MAS', 'Masonry', 'Bricks, blocks, tiles', 'MAS-{TYPE}-{SIZE}-{###}'),
('ELE', 'Electrical', 'Cables, fittings, fixtures', 'ELE-{TYPE}-{SPEC}-{###}'),
('PLB', 'Plumbing', 'Pipes, fittings, fixtures', 'PLB-{TYPE}-{SIZE}-{###}'),
('PAI', 'Paints & Finishes', 'Paints, primers, coatings', 'PAI-{TYPE}-{COLOR}-{###}'),
('WOD', 'Wood & Timber', 'Timber, plywood, boards', 'WOD-{TYPE}-{SIZE}-{###}'),
('CON', 'Concrete', 'Ready mix, precast items', 'CON-{TYPE}-{GRADE}-{###}'),
('INS', 'Insulation', 'Thermal, acoustic insulation', 'INS-{TYPE}-{SPEC}-{###}')
ON CONFLICT DO NOTHING;

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_materials_approval_status ON materials(approval_status);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_active ON materials(is_active);
CREATE INDEX IF NOT EXISTS idx_materials_code ON materials(material_code);
CREATE INDEX IF NOT EXISTS idx_materials_requested_by ON materials(requested_by);

-- 5. Enable RLS
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_categories ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for materials
-- Everyone can see approved materials
CREATE POLICY "Approved materials readable by all" ON materials 
    FOR SELECT USING (approval_status = 'approved' AND is_active = true);

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

-- 7. RLS for categories (read-only for all)
CREATE POLICY "Categories readable by all" ON material_categories 
    FOR SELECT USING (active = true);

CREATE POLICY "Service role can manage categories" ON material_categories 
    FOR ALL USING (auth.role() = 'service_role');

-- 8. Function to generate material codes
CREATE OR REPLACE FUNCTION generate_material_code(category_code VARCHAR, type_suffix VARCHAR DEFAULT '', grade_suffix VARCHAR DEFAULT '')
RETURNS VARCHAR AS $$
DECLARE
    next_num INTEGER;
    new_code VARCHAR;
BEGIN
    -- Get the next sequential number for this category
    SELECT COALESCE(MAX(
        CAST(RIGHT(material_code, 3) AS INTEGER)
    ), 0) + 1
    INTO next_num
    FROM materials 
    WHERE material_code LIKE category_code || '-%';
    
    -- Format the code
    new_code := category_code || '-' || 
                CASE WHEN type_suffix != '' THEN type_suffix || '-' ELSE '' END ||
                CASE WHEN grade_suffix != '' THEN grade_suffix || '-' ELSE '' END ||
                LPAD(next_num::TEXT, 3, '0');
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger to auto-generate material codes
CREATE OR REPLACE FUNCTION auto_generate_material_code()
RETURNS TRIGGER AS $$
DECLARE
    type_part VARCHAR := '';
    grade_part VARCHAR := '';
BEGIN
    -- Only generate code if not provided
    IF NEW.material_code IS NULL THEN
        -- Extract type and grade for code generation
        -- This is a simple example - you can make this more sophisticated
        IF NEW.subcategory IS NOT NULL THEN
            type_part := UPPER(LEFT(NEW.subcategory, 3));
        END IF;
        
        IF NEW.grade_specification IS NOT NULL THEN
            grade_part := UPPER(LEFT(NEW.grade_specification, 3));
        END IF;
        
        NEW.material_code := generate_material_code(NEW.category, type_part, grade_part);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_material_code
    BEFORE INSERT ON materials
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_material_code();

-- 10. Add updated_at trigger
CREATE TRIGGER update_materials_updated_at 
    BEFORE UPDATE ON materials 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Sample approved materials with proper nomenclature
INSERT INTO materials (
    material_code, name, description, category, subcategory, grade_specification, 
    unit, estimated_price, approval_status, is_active
) VALUES
('CEM-OPC-53G-001', 'Ordinary Portland Cement 53 Grade', '53 Grade OPC cement for general construction', 'CEM', 'OPC', '53 Grade', 'bag', 425.00, 'approved', true),
('CEM-PPC-53G-001', 'Portland Pozzolana Cement 53 Grade', '53 Grade PPC cement with fly ash', 'CEM', 'PPC', '53 Grade', 'bag', 410.00, 'approved', true),
('AGG-FIN-RIV-001', 'Fine River Sand', 'Natural river sand for construction', 'AGG', 'Fine', 'River', 'cft', 45.00, 'approved', true),
('AGG-COA-CRU-001', 'Coarse Crushed Sand', 'Machine crushed coarse sand', 'AGG', 'Coarse', 'Crushed', 'cft', 50.00, 'approved', true),
('AGG-STO-20M-001', '20mm Stone Aggregate', '20mm crushed stone aggregate', 'AGG', 'Stone', '20mm', 'cft', 55.00, 'approved', true),
('AGG-STO-10M-001', '10mm Stone Aggregate', '10mm crushed stone aggregate', 'AGG', 'Stone', '10mm', 'cft', 58.00, 'approved', true),
('STL-TMT-12M-001', '12mm TMT Steel Bars Fe500', 'Fe500 grade 12mm TMT reinforcement bars', 'STL', 'TMT', '12mm', 'kg', 72.00, 'approved', true),
('STL-TMT-16M-001', '16mm TMT Steel Bars Fe500', 'Fe500 grade 16mm TMT reinforcement bars', 'STL', 'TMT', '16mm', 'kg', 71.50, 'approved', true),
('STL-TMT-8MM-001', '8mm TMT Steel Bars Fe500', 'Fe500 grade 8mm TMT reinforcement bars', 'STL', 'TMT', '8mm', 'kg', 73.00, 'approved', true),
('STL-ACC-BWI-001', 'Binding Wire MS', 'Mild steel binding wire for reinforcement', 'STL', 'Accessories', 'Wire', 'kg', 85.00, 'approved', true),
('MAS-BRI-CLA-001', 'Red Clay Bricks Standard', 'Standard size red clay bricks', 'MAS', 'Brick', 'Clay', 'nos', 8.50, 'approved', true),
('MAS-BRI-FLY-001', 'Fly Ash Bricks AAC', 'AAC fly ash bricks lightweight', 'MAS', 'Brick', 'FlyAsh', 'nos', 12.00, 'approved', true),
('MAS-BLO-CON-001', 'Concrete Hollow Blocks', 'Cement concrete hollow blocks', 'MAS', 'Block', 'Concrete', 'nos', 45.00, 'approved', true)
ON CONFLICT (material_code) DO NOTHING;

-- 12. Create view for material catalog (only approved materials)
CREATE VIEW material_catalog AS
SELECT 
    material_code,
    name,
    description,
    category,
    subcategory,
    brand,
    grade_specification,
    unit,
    estimated_price,
    created_at
FROM materials 
WHERE approval_status = 'approved' AND is_active = true
ORDER BY category, subcategory, name;

-- 13. Create view for pending material requests (for admin dashboard)
CREATE VIEW pending_material_requests AS
SELECT 
    m.*,
    c.company_name as requested_by_company,
    c.contact_person,
    mc.name as category_name
FROM materials m
LEFT JOIN contractors c ON m.requested_by = c.id
LEFT JOIN material_categories mc ON m.category = mc.code
WHERE m.approval_status = 'pending'
ORDER BY m.urgency DESC, m.created_at ASC;

COMMENT ON TABLE materials IS 'Unified materials table with approval workflow - contractors request, admins approve';
COMMENT ON TABLE material_categories IS 'Material category definitions with nomenclature patterns';
COMMENT ON FUNCTION generate_material_code IS 'Generates standardized material codes following nomenclature';