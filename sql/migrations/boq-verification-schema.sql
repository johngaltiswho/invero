-- BOQ Verification and Quantity Takeoff Schema

-- BOQ Submissions for verification
CREATE TABLE IF NOT EXISTS boq_submissions (
  id SERIAL PRIMARY KEY,
  project_id UUID NOT NULL,
  contractor_id UUID NOT NULL,
  submission_type VARCHAR(50) NOT NULL CHECK (submission_type IN ('initial', 'revision')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'revision_required', 'approved', 'rejected')),
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by UUID, -- admin user id
  review_comments TEXT,
  
  -- BOQ file references
  boq_file_url TEXT,
  drawings_file_urls TEXT[], -- Array of drawing file URLs
  
  -- Summary data
  total_estimated_value DECIMAL(15,2),
  total_materials_count INTEGER,
  
  CONSTRAINT fk_boq_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_boq_contractor FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE
);

-- Detailed quantity takeoff items
CREATE TABLE IF NOT EXISTS quantity_takeoffs (
  id SERIAL PRIMARY KEY,
  boq_submission_id INTEGER NOT NULL,
  
  -- Material identification
  material_category VARCHAR(100) NOT NULL, -- "Reinforcement", "Concrete", etc.
  material_specification TEXT NOT NULL, -- "12mm dia TMT bars, 6m length"
  material_unit VARCHAR(20) NOT NULL, -- "pieces", "kg", "m3", etc.
  
  -- Drawing reference
  drawing_reference VARCHAR(100), -- Which drawing this came from
  drawing_sheet_number VARCHAR(50),
  drawing_detail_reference VARCHAR(100), -- Detail/section reference
  
  -- Quantities
  quantity_from_drawings DECIMAL(10,3) NOT NULL, -- What contractor calculated from drawings
  quantity_verified DECIMAL(10,3), -- What admin verified (after review)
  variance_percentage DECIMAL(5,2), -- Difference between original and verified
  
  -- Verification status
  verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'disputed', 'corrected')),
  verification_notes TEXT,
  
  -- Costing (optional for verification phase)
  estimated_rate DECIMAL(10,2),
  estimated_amount DECIMAL(15,2),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_takeoff_submission FOREIGN KEY (boq_submission_id) REFERENCES boq_submissions(id) ON DELETE CASCADE
);

-- Approved materials (post-verification)
CREATE TABLE IF NOT EXISTS approved_materials (
  id SERIAL PRIMARY KEY,
  project_id UUID NOT NULL,
  contractor_id UUID NOT NULL,
  boq_submission_id INTEGER NOT NULL,
  quantity_takeoff_id INTEGER NOT NULL,
  
  -- Material details (copied from verified takeoff)
  material_category VARCHAR(100) NOT NULL,
  material_specification TEXT NOT NULL,
  material_unit VARCHAR(20) NOT NULL,
  approved_quantity DECIMAL(10,3) NOT NULL,
  
  -- Funding tracking
  total_funding_eligible DECIMAL(15,2), -- Max amount that can be funded for this material
  funded_so_far DECIMAL(15,2) DEFAULT 0, -- How much has been funded already
  remaining_funding DECIMAL(15,2) GENERATED ALWAYS AS (total_funding_eligible - funded_so_far) STORED,
  
  -- Status
  status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'partially_funded', 'fully_funded', 'exhausted')),
  
  approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_approved_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_approved_contractor FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE,
  CONSTRAINT fk_approved_submission FOREIGN KEY (boq_submission_id) REFERENCES boq_submissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_approved_takeoff FOREIGN KEY (quantity_takeoff_id) REFERENCES quantity_takeoffs(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_boq_submissions_contractor ON boq_submissions(contractor_id);
CREATE INDEX IF NOT EXISTS idx_boq_submissions_project ON boq_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_boq_submissions_status ON boq_submissions(status);

CREATE INDEX IF NOT EXISTS idx_quantity_takeoffs_submission ON quantity_takeoffs(boq_submission_id);
CREATE INDEX IF NOT EXISTS idx_quantity_takeoffs_category ON quantity_takeoffs(material_category);
CREATE INDEX IF NOT EXISTS idx_quantity_takeoffs_verification ON quantity_takeoffs(verification_status);

CREATE INDEX IF NOT EXISTS idx_approved_materials_project ON approved_materials(project_id);
CREATE INDEX IF NOT EXISTS idx_approved_materials_contractor ON approved_materials(contractor_id);
CREATE INDEX IF NOT EXISTS idx_approved_materials_status ON approved_materials(status);

-- Triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_quantity_takeoffs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_quantity_takeoffs_updated_at 
    BEFORE UPDATE ON quantity_takeoffs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_quantity_takeoffs_updated_at();

-- Function to update approved materials status based on funding
CREATE OR REPLACE FUNCTION update_approved_material_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.funded_so_far >= NEW.total_funding_eligible THEN
        NEW.status = 'fully_funded';
    ELSIF NEW.funded_so_far > 0 THEN
        NEW.status = 'partially_funded';
    ELSE
        NEW.status = 'available';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_approved_material_status_trigger
    BEFORE UPDATE OF funded_so_far ON approved_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_approved_material_status();