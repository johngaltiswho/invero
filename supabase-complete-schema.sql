-- Streamlined Supabase schema for contractor management system
-- This replaces Google Sheets with a clean, normalized database structure

-- 1. CONTRACTORS TABLE (essential contractor information only)
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
    
    -- Core Business Profile
    years_in_business INTEGER,
    employee_count INTEGER,
    annual_turnover BIGINT,
    business_category VARCHAR,
    specializations TEXT,
    
    -- Core Financial Information (stable data only)
    credit_score INTEGER,
    risk_rating VARCHAR CHECK (risk_rating IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
    bank_name VARCHAR,
    account_number VARCHAR,
    ifsc_code VARCHAR,
    
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

-- 2. PROJECTS TABLE (minimal project information)
CREATE TABLE projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contractor_id UUID REFERENCES contractors(id) ON DELETE CASCADE,
    
    -- Core Project Information (cannot be derived)
    project_name VARCHAR NOT NULL,
    project_id_external VARCHAR, -- External project identifier
    client_name VARCHAR NOT NULL,
    
    -- Financial (baseline, actual value comes from BOQ)
    estimated_value BIGINT, -- Initial estimate, actual comes from BOQ
    funding_required BIGINT,
    funding_status VARCHAR DEFAULT 'pending',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    
    -- REMOVED FIELDS (derived from other tables):
    -- project_value -> calculated from BOQ total
    -- start_date -> calculated from schedule (earliest task start)
    -- expected_end_date -> calculated from schedule (latest task end)
    -- actual_end_date -> calculated from schedule (when all tasks 100%)
    -- current_progress -> calculated from schedule (weighted average)
    -- status -> calculated from schedule progress and dates
    -- priority -> can be derived from business logic or kept in metadata
);

-- 3. PROJECT MILESTONES - REMOVED
-- Milestones are derived from schedule_tasks where task is marked as milestone
-- or from financial_milestones for payment milestones

-- 4. FINANCIAL MILESTONES - REMOVED FOR NOW
-- Will add financial tracking in a later phase

-- 5. ACTIVITIES - REMOVED FOR NOW
-- Activities will be derived from BOQ/Schedule uploads and task progress changes
-- Can add manual activities table later if needed

-- 6. Update existing BOQ and Schedule tables to use proper foreign keys
ALTER TABLE project_boqs 
    ALTER COLUMN project_id TYPE UUID USING project_id::UUID,
    ALTER COLUMN contractor_id TYPE UUID USING contractor_id::UUID,
    ADD CONSTRAINT fk_project_boqs_project FOREIGN KEY (project_id) REFERENCES projects(id),
    ADD CONSTRAINT fk_project_boqs_contractor FOREIGN KEY (contractor_id) REFERENCES contractors(id);

ALTER TABLE project_schedules 
    ALTER COLUMN project_id TYPE UUID USING project_id::UUID,
    ALTER COLUMN contractor_id TYPE UUID USING contractor_id::UUID,
    ADD CONSTRAINT fk_project_schedules_project FOREIGN KEY (project_id) REFERENCES projects(id),
    ADD CONSTRAINT fk_project_schedules_contractor FOREIGN KEY (contractor_id) REFERENCES contractors(id);

-- Create indexes for better performance
CREATE INDEX idx_contractors_email ON contractors(email);
CREATE INDEX idx_contractors_clerk_user_id ON contractors(clerk_user_id);
CREATE INDEX idx_contractors_status ON contractors(status);
CREATE INDEX idx_projects_contractor_id ON projects(contractor_id);

-- Enable Row Level Security
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant isolation
-- Contractors can only see their own data
CREATE POLICY "Contractors can view own data" ON contractors 
    FOR SELECT USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Contractors can update own data" ON contractors 
    FOR UPDATE USING (clerk_user_id = auth.jwt() ->> 'sub');

-- Projects are visible to their contractor
CREATE POLICY "Contractors can view own projects" ON projects 
    FOR SELECT USING (contractor_id IN (
        SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
    ));


-- Admin/system access policies (for API operations)
CREATE POLICY "Service role has full access" ON contractors 
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON projects 
    FOR ALL USING (auth.role() = 'service_role');

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_contractors_updated_at BEFORE UPDATE ON contractors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- CREATE VIEWS FOR COMPUTED VALUES
-- Instead of storing computed fields, create views to calculate them on-demand

-- Project enriched view with computed data from BOQ and Schedule
CREATE VIEW project_details AS
SELECT 
    p.*,
    -- Project value from BOQ (actual) or estimated value (fallback)
    COALESCE(boq.total_amount, p.estimated_value) as project_value,
    
    -- Timeline from schedule
    schedule.start_date,
    schedule.expected_end_date,
    schedule.actual_end_date,
    
    -- Progress from schedule (weighted average of tasks)
    COALESCE(schedule.current_progress, 0) as current_progress,
    
    -- Status derived from progress and dates
    CASE 
        WHEN schedule.current_progress >= 100 THEN 'Completed'
        WHEN schedule.current_progress >= 90 THEN 'Completing'
        WHEN schedule.expected_end_date < CURRENT_DATE AND schedule.current_progress < 100 THEN 'Delayed'
        WHEN schedule.current_progress > 0 THEN 'Active'
        ELSE 'Planning'
    END as status,
    
    -- Next milestone from schedule
    schedule.next_milestone,
    schedule.next_milestone_date

FROM projects p
LEFT JOIN (
    SELECT 
        project_id,
        total_amount
    FROM project_boqs pb1
    WHERE pb1.created_at = (
        SELECT MAX(pb2.created_at) 
        FROM project_boqs pb2 
        WHERE pb2.project_id = pb1.project_id
    )
) boq ON p.id = boq.project_id
LEFT JOIN (
    SELECT 
        ps.project_id,
        MIN(st.start_date) as start_date,
        MAX(st.end_date) as expected_end_date,
        CASE 
            WHEN AVG(st.progress) = 100 THEN MAX(st.end_date)
            ELSE NULL 
        END as actual_end_date,
        AVG(st.progress) as current_progress,
        -- Next incomplete task as milestone
        (SELECT st2.task 
         FROM schedule_tasks st2 
         WHERE st2.schedule_id = ps.id 
           AND st2.progress < 100 
         ORDER BY st2.end_date 
         LIMIT 1) as next_milestone,
        (SELECT st2.end_date 
         FROM schedule_tasks st2 
         WHERE st2.schedule_id = ps.id 
           AND st2.progress < 100 
         ORDER BY st2.end_date 
         LIMIT 1) as next_milestone_date
    FROM project_schedules ps
    LEFT JOIN schedule_tasks st ON ps.id = st.schedule_id
    WHERE ps.created_at = (
        SELECT MAX(ps2.created_at) 
        FROM project_schedules ps2 
        WHERE ps2.project_id = ps.project_id
    )
    GROUP BY ps.project_id, ps.id
) schedule ON p.id = schedule.project_id;

-- Contractor summary view with computed metrics
CREATE VIEW contractor_summary AS
SELECT 
    c.*,
    -- Computed project metrics from enriched project data
    COALESCE(p.completed_projects, 0) as completed_projects,
    COALESCE(p.active_projects, 0) as active_projects,
    COALESCE(p.total_project_value, 0) as total_project_value,
    COALESCE(p.average_project_value, 0) as average_project_value,
    COALESCE(
        CASE 
            WHEN p.total_projects > 0 
            THEN (p.completed_projects::DECIMAL / p.total_projects * 100)
            ELSE 0 
        END, 0
    ) as success_rate,
    -- Capacity utilization (% of annual turnover currently committed)
    COALESCE(
        CASE 
            WHEN c.annual_turnover > 0 AND c.annual_turnover > 0
            THEN (p.active_project_value::DECIMAL / c.annual_turnover * 100)
            ELSE 0 
        END, 0
    ) as capacity_utilization,
    -- Available capacity
    COALESCE(c.annual_turnover - p.active_project_value, c.annual_turnover) as available_capacity
FROM contractors c
LEFT JOIN (
    SELECT 
        contractor_id,
        COUNT(*) as total_projects,
        COUNT(*) FILTER (WHERE status = 'Completed') as completed_projects,
        COUNT(*) FILTER (WHERE status IN ('Active', 'Planning')) as active_projects,
        SUM(project_value) as total_project_value,
        SUM(project_value) FILTER (WHERE status IN ('Active', 'Planning')) as active_project_value,
        AVG(project_value) as average_project_value
    FROM project_details 
    GROUP BY contractor_id
) p ON c.id = p.contractor_id;

-- Activity feed view (derived from BOQ and Schedule uploads)
CREATE VIEW activity_feed AS
-- BOQ upload activities
SELECT 
    pb.id,
    pb.contractor_id,
    pb.project_id,
    'document_uploaded' as type,
    'BOQ Uploaded: ' || pb.file_name as title,
    'Project BOQ uploaded with value ' || pb.total_amount as description,
    'completed' as status,
    pb.total_amount as amount,
    pb.upload_date as activity_date,
    pb.created_at,
    'boq' as source
FROM project_boqs pb

UNION ALL

-- Schedule upload activities  
SELECT 
    ps.id,
    ps.contractor_id,
    ps.project_id,
    'document_uploaded' as type,
    'Schedule Uploaded: ' || ps.file_name as title,
    'Project schedule uploaded with ' || ps.total_duration || ' days duration' as description,
    'completed' as status,
    NULL as amount,
    ps.upload_date as activity_date,
    ps.created_at,
    'schedule' as source
FROM project_schedules ps

ORDER BY activity_date DESC;