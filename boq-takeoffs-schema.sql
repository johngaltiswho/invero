-- BOQ Takeoffs table for saving takeoff sessions
CREATE TABLE boq_takeoffs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL,
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    
    -- File information
    file_name VARCHAR NOT NULL,
    file_url TEXT,
    
    -- Takeoff data
    takeoff_data JSONB NOT NULL, -- Array of BOQ items
    total_items INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_boq_takeoffs_project_id ON boq_takeoffs(project_id);
CREATE INDEX idx_boq_takeoffs_contractor_id ON boq_takeoffs(contractor_id);
CREATE INDEX idx_boq_takeoffs_created_at ON boq_takeoffs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE boq_takeoffs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Contractors can only see their own takeoffs
CREATE POLICY "Contractors can view own takeoffs" ON boq_takeoffs 
    FOR SELECT USING (contractor_id IN (
        SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
    ));

CREATE POLICY "Contractors can insert own takeoffs" ON boq_takeoffs 
    FOR INSERT WITH CHECK (contractor_id IN (
        SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
    ));

CREATE POLICY "Contractors can update own takeoffs" ON boq_takeoffs 
    FOR UPDATE USING (contractor_id IN (
        SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
    ));

-- Admin/system access policies (for API operations)
CREATE POLICY "Service role has full access" ON boq_takeoffs 
    FOR ALL USING (auth.role() = 'service_role');

-- Create trigger for updated_at
CREATE TRIGGER update_boq_takeoffs_updated_at BEFORE UPDATE ON boq_takeoffs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();