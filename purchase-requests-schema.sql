-- Purchase Requests workflow schema

-- Vendors table for storing vendor information
CREATE TABLE vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name VARCHAR NOT NULL,
    contact_person VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    address TEXT,
    gst_number VARCHAR,
    pan_number VARCHAR,
    -- Verification status
    verification_status VARCHAR DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchase Requests table
CREATE TABLE purchase_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL,
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    
    -- Request details
    request_type VARCHAR DEFAULT 'material_purchase' CHECK (request_type IN ('material_purchase', 'equipment_rental')),
    priority VARCHAR DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    delivery_date DATE,
    delivery_address TEXT,
    
    -- Status tracking
    status VARCHAR DEFAULT 'pending' CHECK (status IN (
        'pending',           -- Initial request
        'admin_review',      -- Under admin review
        'approved',          -- Approved for procurement
        'vendor_contacted',  -- PDF sent to vendor
        'quote_received',    -- Quote uploaded by contractor
        'quote_review',      -- Quote under admin review
        'approved_for_funding', -- Approved for fund disbursement
        'funds_disbursed',   -- Funds released
        'completed',         -- Purchase completed
        'rejected',          -- Request rejected
        'cancelled'          -- Request cancelled
    )),
    
    -- Financial details
    estimated_total DECIMAL(12,2),
    quoted_total DECIMAL(12,2),
    approved_amount DECIMAL(12,2),
    
    -- Documents
    vendor_pdf_url TEXT,        -- Generated PDF for vendor
    quote_file_url TEXT,        -- Uploaded quote from vendor
    additional_documents JSONB, -- Any additional documents
    
    -- Notes and comments
    contractor_notes TEXT,
    admin_notes TEXT,
    rejection_reason TEXT,
    
    -- Timestamps
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchase Request Items table (items within each request)
CREATE TABLE purchase_request_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_request_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
    material_request_id UUID REFERENCES material_requests(id), -- Link to original material request
    
    -- Item details
    item_name VARCHAR NOT NULL,
    item_description TEXT,
    item_category VARCHAR,
    unit VARCHAR NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    
    -- Pricing
    estimated_rate DECIMAL(10,2),
    quoted_rate DECIMAL(10,2),
    approved_rate DECIMAL(10,2),
    
    -- Selection status (contractor can select which items to include in final order)
    selected_for_order BOOLEAN DEFAULT true,
    contractor_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Status History table for tracking all status changes
CREATE TABLE purchase_request_status_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_request_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
    from_status VARCHAR,
    to_status VARCHAR NOT NULL,
    changed_by UUID, -- User who made the change
    change_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_purchase_requests_project_id ON purchase_requests(project_id);
CREATE INDEX idx_purchase_requests_contractor_id ON purchase_requests(contractor_id);
CREATE INDEX idx_purchase_requests_vendor_id ON purchase_requests(vendor_id);
CREATE INDEX idx_purchase_requests_status ON purchase_requests(status);
CREATE INDEX idx_purchase_requests_created_at ON purchase_requests(created_at DESC);
CREATE INDEX idx_purchase_request_items_request_id ON purchase_request_items(purchase_request_id);
CREATE INDEX idx_vendors_verification_status ON vendors(verification_status);

-- Enable Row Level Security
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_request_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendors
CREATE POLICY "Anyone can view verified vendors" ON vendors 
    FOR SELECT USING (verification_status = 'verified');

CREATE POLICY "Service role has full vendor access" ON vendors 
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for purchase_requests
CREATE POLICY "Contractors can view own purchase requests" ON purchase_requests 
    FOR SELECT USING (contractor_id IN (
        SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
    ));

CREATE POLICY "Contractors can insert own purchase requests" ON purchase_requests 
    FOR INSERT WITH CHECK (contractor_id IN (
        SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
    ));

CREATE POLICY "Contractors can update own purchase requests" ON purchase_requests 
    FOR UPDATE USING (contractor_id IN (
        SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
    ));

CREATE POLICY "Service role has full purchase request access" ON purchase_requests 
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for purchase_request_items
CREATE POLICY "Users can view items for accessible requests" ON purchase_request_items 
    FOR SELECT USING (purchase_request_id IN (
        SELECT id FROM purchase_requests WHERE contractor_id IN (
            SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    ));

CREATE POLICY "Users can modify items for accessible requests" ON purchase_request_items 
    FOR ALL USING (purchase_request_id IN (
        SELECT id FROM purchase_requests WHERE contractor_id IN (
            SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    ));

CREATE POLICY "Service role has full purchase request items access" ON purchase_request_items 
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for status history
CREATE POLICY "Users can view status history for accessible requests" ON purchase_request_status_history 
    FOR SELECT USING (purchase_request_id IN (
        SELECT id FROM purchase_requests WHERE contractor_id IN (
            SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    ));

CREATE POLICY "Service role has full status history access" ON purchase_request_status_history 
    FOR ALL USING (auth.role() = 'service_role');

-- Create triggers for updated_at
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_requests_updated_at BEFORE UPDATE ON purchase_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_request_items_updated_at BEFORE UPDATE ON purchase_request_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create status history when purchase request status changes
CREATE OR REPLACE FUNCTION create_purchase_request_status_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create history entry if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO purchase_request_status_history (
            purchase_request_id,
            from_status,
            to_status,
            changed_by,
            change_reason
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NEW.updated_by, -- This should be set by the application
            NEW.status_change_reason -- This should be set by the application
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status history
CREATE TRIGGER purchase_request_status_change_history 
    AFTER UPDATE ON purchase_requests
    FOR EACH ROW EXECUTE FUNCTION create_purchase_request_status_history();

-- Add some default vendors for testing
INSERT INTO vendors (company_name, contact_person, email, phone, verification_status) VALUES
('Rajesh Building Materials', 'Rajesh Kumar', 'rajesh@buildmat.com', '+91-9876543210', 'verified'),
('Modern Construction Supplies', 'Suresh Patel', 'suresh@modernconstruction.com', '+91-9876543211', 'verified'),
('Quality Steel & Cement', 'Amit Singh', 'amit@qualitysteel.com', '+91-9876543212', 'verified'),
('Express Hardware', 'Priya Sharma', 'priya@expresshardware.com', '+91-9876543213', 'verified'),
('Metro Building Solutions', 'Vikram Gupta', 'vikram@metrobuilding.com', '+91-9876543214', 'pending');