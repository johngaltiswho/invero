-- Project files table for file uploads and document management
-- This stores metadata for files uploaded to projects

CREATE TABLE IF NOT EXISTS project_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Links to existing tables
    project_id VARCHAR NOT NULL, -- References projects.id
    contractor_id UUID NOT NULL REFERENCES contractors(id),
    
    -- File metadata
    file_name VARCHAR NOT NULL,
    original_name VARCHAR NOT NULL, -- Original filename when uploaded
    description TEXT,
    category VARCHAR NOT NULL CHECK (category IN ('drawings', 'boq', 'po', 'other')),
    version VARCHAR DEFAULT '1.0',
    
    -- File storage info
    file_path VARCHAR NOT NULL, -- Path in storage bucket
    file_url VARCHAR, -- Public URL if needed
    file_size BIGINT NOT NULL, -- Size in bytes
    mime_type VARCHAR NOT NULL,
    
    -- Metadata
    uploaded_by VARCHAR, -- User who uploaded (can be different from contractor)
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_contractor_id ON project_files(contractor_id);
CREATE INDEX IF NOT EXISTS idx_project_files_category ON project_files(category);
CREATE INDEX IF NOT EXISTS idx_project_files_created_at ON project_files(created_at DESC);

-- Enable Row Level Security
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies (use DROP POLICY IF EXISTS to avoid conflicts)
DROP POLICY IF EXISTS "Contractors can manage own project files" ON project_files;
DROP POLICY IF EXISTS "Service role has full access to project files" ON project_files;

-- Contractors can only manage files for their own projects
CREATE POLICY "Contractors can manage own project files" ON project_files 
    FOR ALL USING (
        contractor_id IN (
            SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

-- Service role has full access (for API operations)
CREATE POLICY "Service role has full access to project files" ON project_files 
    FOR ALL USING (auth.role() = 'service_role');

-- Add updated_at trigger (drop if exists to avoid conflicts)
DROP TRIGGER IF EXISTS update_project_files_updated_at ON project_files;
CREATE TRIGGER update_project_files_updated_at 
    BEFORE UPDATE ON project_files 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Use existing contractor-documents bucket for project files
-- Note: This uses the existing bucket with folder structure for organization
/*
The existing contractor-documents bucket will be used with this folder structure:
contractor_id/project_id/category/filename

Existing storage policies should already allow contractors to upload to their own folders:
- contractor-documents bucket already exists
- Policies already allow contractors to manage files in their contractor_id folders
- Project files will be stored under: contractor_id/project_id/category/filename
- Master documents can be stored under: contractor_id/master/category/filename (future feature)
*/

COMMENT ON TABLE project_files IS 'File uploads for projects - drawings, BOQs, POs, and other documents';
COMMENT ON COLUMN project_files.file_path IS 'Storage path: contractor_id/project_id/category/filename';
COMMENT ON COLUMN project_files.category IS 'File category: drawings, boq, po, other';