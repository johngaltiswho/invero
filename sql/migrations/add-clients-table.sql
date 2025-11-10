-- Add clients table for client management in Network tab
-- Simple client information for project creation dropdown

-- 1. Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    
    -- Basic client information
    name VARCHAR NOT NULL,
    contact_person VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    address TEXT,
    
    -- Business information
    company_type VARCHAR, -- 'individual', 'company', 'government', 'ngo'
    gst_number VARCHAR,
    pan_number VARCHAR,
    
    -- Status
    status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add indexes
CREATE INDEX IF NOT EXISTS idx_clients_contractor_id ON clients(contractor_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

-- 3. Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies - Contractors can only manage their own clients
CREATE POLICY "Contractors can manage own clients" ON clients 
    FOR ALL USING (
        contractor_id IN (
            SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

-- Service role has full access (for API operations)
CREATE POLICY "Service role has full access to clients" ON clients 
    FOR ALL USING (auth.role() = 'service_role');

-- 5. Add updated_at trigger
CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON clients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE clients IS 'Client management for contractors - used in project creation and network management';