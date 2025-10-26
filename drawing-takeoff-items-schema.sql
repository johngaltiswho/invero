-- Individual Drawing Takeoff Items Schema
-- This stores individual takeoff calculations that contractors do on drawings

CREATE TABLE IF NOT EXISTS drawing_takeoff_items (
  id SERIAL PRIMARY KEY,
  project_id UUID NOT NULL,
  contractor_id UUID NOT NULL,
  
  -- Drawing context
  drawing_file_name VARCHAR(255),
  drawing_file_url TEXT,
  
  -- Material details (from contractor's takeoff)
  material_name VARCHAR(255) NOT NULL,
  material_description TEXT,
  material_unit VARCHAR(50) NOT NULL,
  
  -- Takeoff calculations
  nos INTEGER DEFAULT 1,
  length DECIMAL(10,3),
  breadth DECIMAL(10,3),
  height DECIMAL(10,3),
  contractor_quantity DECIMAL(10,3) NOT NULL,
  contractor_notes TEXT,
  
  -- Admin verification
  admin_verified_quantity DECIMAL(10,3),
  verification_status VARCHAR(50) DEFAULT 'pending' 
    CHECK (verification_status IN ('pending', 'verified', 'disputed', 'revision_required')),
  admin_notes TEXT,
  verified_by VARCHAR(100), -- admin username/email
  verified_at TIMESTAMP,
  
  -- Financial
  estimated_rate DECIMAL(10,2),
  estimated_amount DECIMAL(15,2),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_drawing_takeoff_project 
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_drawing_takeoff_contractor 
    FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_drawing_takeoff_project ON drawing_takeoff_items(project_id);
CREATE INDEX IF NOT EXISTS idx_drawing_takeoff_contractor ON drawing_takeoff_items(contractor_id);
CREATE INDEX IF NOT EXISTS idx_drawing_takeoff_verification_status ON drawing_takeoff_items(verification_status);
CREATE INDEX IF NOT EXISTS idx_drawing_takeoff_created_at ON drawing_takeoff_items(created_at);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_drawing_takeoff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';