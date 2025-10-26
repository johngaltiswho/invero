-- Material Request System Schema
-- Allows contractors to request new materials to be added to master data
-- Admins can review and approve/reject these requests

-- 1. Material requests table
CREATE TABLE material_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    
    -- Requested material details
    name VARCHAR NOT NULL,
    description TEXT,
    category VARCHAR NOT NULL,
    subcategory VARCHAR,
    unit VARCHAR NOT NULL,
    estimated_price DECIMAL(10,2),
    
    -- Supplier and specification details
    supplier_name VARCHAR,
    supplier_contact TEXT,
    specifications JSONB,
    brand VARCHAR,
    model_number VARCHAR,
    
    -- Request context
    justification TEXT NOT NULL, -- Why this material is needed
    project_context VARCHAR, -- Which project needs this material
    urgency VARCHAR DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
    
    -- Status and workflow
    status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'duplicate')),
    
    -- Admin review details
    reviewed_by VARCHAR, -- Admin user ID who reviewed
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    rejection_reason TEXT,
    
    -- If approved, link to created material
    created_material_id UUID REFERENCES materials(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Material request attachments (for specs, images, etc.)
CREATE TABLE material_request_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES material_requests(id) ON DELETE CASCADE,
    file_name VARCHAR NOT NULL,
    file_url VARCHAR NOT NULL,
    file_type VARCHAR, -- 'image', 'pdf', 'document'
    file_size INTEGER,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX idx_material_requests_contractor_id ON material_requests(contractor_id);
CREATE INDEX idx_material_requests_status ON material_requests(status);
CREATE INDEX idx_material_requests_category ON material_requests(category);
CREATE INDEX idx_material_requests_created_at ON material_requests(created_at DESC);
CREATE INDEX idx_material_request_attachments_request_id ON material_request_attachments(request_id);

-- 4. Enable RLS
ALTER TABLE material_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_request_attachments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for material_requests
-- Contractors can see their own requests
CREATE POLICY "Contractors can view own material requests" ON material_requests 
    FOR SELECT USING (
        contractor_id IN (
            SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

-- Contractors can create requests
CREATE POLICY "Contractors can create material requests" ON material_requests 
    FOR INSERT WITH CHECK (
        contractor_id IN (
            SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

-- Contractors can update their own pending requests
CREATE POLICY "Contractors can update own pending requests" ON material_requests 
    FOR UPDATE USING (
        contractor_id IN (
            SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
        ) AND status = 'pending'
    );

-- Service role (admin) has full access
CREATE POLICY "Service role has full access to material requests" ON material_requests 
    FOR ALL USING (auth.role() = 'service_role');

-- 6. RLS Policies for attachments
CREATE POLICY "Contractors can view own request attachments" ON material_request_attachments 
    FOR SELECT USING (
        request_id IN (
            SELECT id FROM material_requests 
            WHERE contractor_id IN (
                SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
            )
        )
    );

CREATE POLICY "Contractors can create attachments for own requests" ON material_request_attachments 
    FOR INSERT WITH CHECK (
        request_id IN (
            SELECT id FROM material_requests 
            WHERE contractor_id IN (
                SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
            )
        )
    );

CREATE POLICY "Service role has full access to attachments" ON material_request_attachments 
    FOR ALL USING (auth.role() = 'service_role');

-- 7. Add triggers for updated_at
CREATE TRIGGER update_material_requests_updated_at 
    BEFORE UPDATE ON material_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Create view for enriched material requests with contractor details
CREATE VIEW material_requests_detailed AS
SELECT 
    mr.*,
    c.company_name,
    c.contact_person,
    c.email as contractor_email,
    c.phone as contractor_phone,
    -- Count of attachments
    (SELECT COUNT(*) FROM material_request_attachments WHERE request_id = mr.id) as attachment_count,
    -- Related material info if approved
    m.name as created_material_name,
    m.current_price as created_material_price
FROM material_requests mr
LEFT JOIN contractors c ON mr.contractor_id = c.id
LEFT JOIN materials m ON mr.created_material_id = m.id;

-- 9. Create notification/activity tracking for requests
CREATE TABLE material_request_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES material_requests(id) ON DELETE CASCADE,
    activity_type VARCHAR NOT NULL CHECK (activity_type IN ('created', 'updated', 'reviewed', 'approved', 'rejected', 'comment_added')),
    actor_id VARCHAR NOT NULL, -- User ID who performed action
    actor_name VARCHAR,
    message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_material_request_activities_request_id ON material_request_activities(request_id);
CREATE INDEX idx_material_request_activities_created_at ON material_request_activities(created_at DESC);

-- Enable RLS for activities
ALTER TABLE material_request_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activities for accessible requests" ON material_request_activities 
    FOR SELECT USING (
        request_id IN (
            SELECT id FROM material_requests 
            WHERE contractor_id IN (
                SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
            )
        ) OR auth.role() = 'service_role'
    );

CREATE POLICY "Service role can manage all activities" ON material_request_activities 
    FOR ALL USING (auth.role() = 'service_role');

-- 10. Sample material categories for the request form
INSERT INTO materials (name, category, subcategory, unit, current_price, description, is_active) VALUES
-- Common categories that contractors might request additions to
('Sample Category Entry', 'Electrical', 'Wiring', 'meter', 0.00, 'This is a sample entry for reference', false)
ON CONFLICT DO NOTHING;