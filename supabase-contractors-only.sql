-- Create contractors table only (phase 1 migration)
-- This allows contractor applications to work without breaking existing BOQ/Schedule data

CREATE TABLE contractors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_user_id VARCHAR UNIQUE, -- Link to Clerk authentication
    email VARCHAR UNIQUE NOT NULL,
    
    -- Core Company Information
    company_name VARCHAR NOT NULL,
    registration_number VARCHAR,
    pan_number VARCHAR,
    gstin VARCHAR,
    incorporation_date DATE,
    company_type VARCHAR CHECK (company_type IN ('private-limited', 'partnership', 'proprietorship', 'llp')),
    business_address TEXT,
    
    -- Core Contact Information
    contact_person VARCHAR NOT NULL,
    phone VARCHAR NOT NULL,
    
    -- Optional Business Profile (removed from form but kept in DB for later)
    years_in_business INTEGER,
    employee_count INTEGER,
    annual_turnover BIGINT,
    business_category VARCHAR,
    specializations TEXT,
    
    -- Optional Financial Information (removed from form but kept in DB for later) 
    credit_score INTEGER,
    risk_rating VARCHAR CHECK (risk_rating IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
    bank_name VARCHAR,
    account_number VARCHAR,
    ifsc_code VARCHAR,
    
    -- Legacy fields for Google Sheets compatibility
    completed_projects INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0,
    average_project_value BIGINT DEFAULT 0,
    capacity_utilization DECIMAL(5,2) DEFAULT 0,
    available_capacity BIGINT DEFAULT 0,
    
    -- KYC Documents (store document metadata and verification status)
    documents JSONB DEFAULT '{
        "pan_card": {"uploaded": false, "verified": false, "file_url": null, "file_name": null, "uploaded_at": null, "verified_at": null, "rejection_reason": null},
        "gst_certificate": {"uploaded": false, "verified": false, "file_url": null, "file_name": null, "uploaded_at": null, "verified_at": null, "rejection_reason": null},
        "company_registration": {"uploaded": false, "verified": false, "file_url": null, "file_name": null, "uploaded_at": null, "verified_at": null, "rejection_reason": null},
        "cancelled_cheque": {"uploaded": false, "verified": false, "file_url": null, "file_name": null, "uploaded_at": null, "verified_at": null, "rejection_reason": null}
    }',
    
    -- Status & Verification
    status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'suspended')),
    verification_status VARCHAR DEFAULT 'documents_pending' CHECK (verification_status IN ('documents_pending', 'documents_uploaded', 'under_verification', 'verified', 'rejected')),
    application_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_date TIMESTAMP WITH TIME ZONE,
    verified_by VARCHAR, -- Admin who verified
    rejection_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_contractors_email ON contractors(email);
CREATE INDEX idx_contractors_clerk_user_id ON contractors(clerk_user_id);
CREATE INDEX idx_contractors_status ON contractors(status);
CREATE INDEX idx_contractors_verification_status ON contractors(verification_status);

-- Enable Row Level Security
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant isolation
-- Contractors can only see their own data
CREATE POLICY "Contractors can view own data" ON contractors 
    FOR SELECT USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Contractors can update own data" ON contractors 
    FOR UPDATE USING (clerk_user_id = auth.jwt() ->> 'sub');

-- Admin/system access policies (for API operations)
CREATE POLICY "Service role has full access" ON contractors 
    FOR ALL USING (auth.role() = 'service_role');

-- Function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_contractors_updated_at BEFORE UPDATE ON contractors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();