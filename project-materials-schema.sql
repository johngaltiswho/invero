-- Simple project_materials table for contractor-added materials
-- This is separate from boq_material_mappings which is for AI-analyzed BOQ items

CREATE TABLE IF NOT EXISTS project_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Links to existing tables
    project_id VARCHAR NOT NULL, -- References projects.id (VARCHAR in existing schema)
    contractor_id UUID NOT NULL REFERENCES contractors(id),
    material_id UUID NOT NULL REFERENCES materials(id),
    
    -- Material specifics for this project  
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR NOT NULL, -- Can override material's default unit
    notes TEXT,
    
    -- Simple status tracking
    status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'platform_order', 'external_purchase', 'delivered', 'used')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_materials_project_id ON project_materials(project_id);
CREATE INDEX IF NOT EXISTS idx_project_materials_contractor_id ON project_materials(contractor_id);
CREATE INDEX IF NOT EXISTS idx_project_materials_material_id ON project_materials(material_id);
CREATE INDEX IF NOT EXISTS idx_project_materials_status ON project_materials(status);

-- Enable Row Level Security
ALTER TABLE project_materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Contractors can only manage their own project materials
CREATE POLICY "Contractors can manage own project materials" ON project_materials 
    FOR ALL USING (
        contractor_id IN (
            SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

-- Service role has full access (for API operations)
CREATE POLICY "Service role has full access to project materials" ON project_materials 
    FOR ALL USING (auth.role() = 'service_role');

-- Add updated_at trigger
CREATE TRIGGER update_project_materials_updated_at 
    BEFORE UPDATE ON project_materials 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE project_materials IS 'Materials manually added to projects by contractors for tracking and procurement';
COMMENT ON COLUMN project_materials.status IS 'Material procurement/usage status: pending -> platform_order/external_purchase -> delivered -> used';