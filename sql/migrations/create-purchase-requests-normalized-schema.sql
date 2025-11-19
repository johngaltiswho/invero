-- Normalized Purchase Requests Schema
-- This replaces the denormalized approach in project_materials

-- Create purchase_requests table
CREATE TABLE IF NOT EXISTS purchase_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id VARCHAR NOT NULL, -- References projects.id (VARCHAR in existing schema)
    contractor_id UUID NOT NULL REFERENCES contractors(id),
    
    -- Request metadata
    status VARCHAR DEFAULT 'draft' CHECK (status IN (
        'draft',         -- Being created by contractor
        'submitted',     -- Submitted for admin review  
        'approved',      -- Approved by admin
        'funded',        -- Funds disbursed
        'po_generated',  -- Purchase order created
        'completed',     -- Purchase completed
        'rejected'       -- Request rejected
    )),
    
    created_by UUID, -- User ID who created the request
    remarks TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    funded_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    approved_by UUID,
    approval_notes TEXT
);

-- Create purchase_request_items table
CREATE TABLE IF NOT EXISTS purchase_request_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_request_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
    project_material_id UUID NOT NULL REFERENCES project_materials(id),
    
    -- Quantities
    requested_qty DECIMAL(10,3) NOT NULL CHECK (requested_qty > 0),
    approved_qty DECIMAL(10,3) CHECK (approved_qty >= 0),
    
    -- Pricing (for future use)
    unit_rate DECIMAL(10,2),
    tax_percent DECIMAL(5,2) DEFAULT 0,
    
    -- Item-level status (optional, can mirror parent or be more granular)
    status VARCHAR DEFAULT 'pending' CHECK (status IN (
        'pending',   -- Waiting for approval
        'approved',  -- Approved for procurement
        'ordered',   -- Purchase order sent
        'received',  -- Materials received
        'rejected'   -- Item rejected
    )),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchase_requests_project_id ON purchase_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_contractor_id ON purchase_requests(contractor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_created_at ON purchase_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_purchase_request_items_request_id ON purchase_request_items(purchase_request_id);
CREATE INDEX IF NOT EXISTS idx_purchase_request_items_material_id ON purchase_request_items(project_material_id);

-- Create aggregated view for materials with computed quantities
CREATE OR REPLACE VIEW project_materials_with_totals AS
SELECT 
    pm.id as project_material_id,
    pm.project_id,
    pm.material_id,
    pm.contractor_id,
    
    -- Material details
    COALESCE(m.name, 'Unknown Material') as name,
    m.description,
    pm.unit,
    m.category,
    
    -- Base quantities from project_materials
    pm.quantity as required_qty,
    COALESCE(pm.available_qty, 0) as available_qty,
    
    -- Computed quantities from purchase requests
    COALESCE(
        (SELECT SUM(pri.requested_qty) 
         FROM purchase_request_items pri 
         JOIN purchase_requests pr ON pri.purchase_request_id = pr.id 
         WHERE pri.project_material_id = pm.id 
         AND pr.status IN ('submitted', 'approved', 'funded', 'po_generated')),
        0
    ) as requested_qty,
    
    COALESCE(
        (SELECT SUM(pri.approved_qty) 
         FROM purchase_request_items pri 
         JOIN purchase_requests pr ON pri.purchase_request_id = pr.id 
         WHERE pri.project_material_id = pm.id 
         AND pr.status IN ('approved', 'funded', 'po_generated', 'completed')
         AND pri.approved_qty IS NOT NULL),
        0
    ) as ordered_qty,
    
    -- Additional useful fields
    pm.notes,
    pm.source_type,
    pm.created_at,
    pm.updated_at
    
FROM project_materials pm
LEFT JOIN materials m ON pm.material_id = m.id;

-- Enable Row Level Security
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_request_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for purchase_requests
CREATE POLICY "Contractors can manage own purchase requests" ON purchase_requests 
    FOR ALL USING (
        contractor_id IN (
            SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Service role has full purchase request access" ON purchase_requests 
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for purchase_request_items  
CREATE POLICY "Users can manage items for accessible requests" ON purchase_request_items 
    FOR ALL USING (
        purchase_request_id IN (
            SELECT id FROM purchase_requests WHERE contractor_id IN (
                SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
            )
        )
    );

CREATE POLICY "Service role has full purchase request items access" ON purchase_request_items 
    FOR ALL USING (auth.role() = 'service_role');

-- Create updated_at triggers
CREATE TRIGGER update_purchase_requests_updated_at 
    BEFORE UPDATE ON purchase_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_request_items_updated_at 
    BEFORE UPDATE ON purchase_request_items  
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE purchase_requests IS 'Normalized purchase requests replacing denormalized approach in project_materials';
COMMENT ON TABLE purchase_request_items IS 'Individual items within each purchase request';
COMMENT ON VIEW project_materials_with_totals IS 'Aggregated view showing computed requested_qty and ordered_qty from purchase requests';