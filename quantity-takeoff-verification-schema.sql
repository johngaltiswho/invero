-- Individual Quantity Takeoff Verification Schema

-- Table to store individual takeoff items for verification
CREATE TABLE IF NOT EXISTS takeoff_items (
  id SERIAL PRIMARY KEY,
  project_id UUID NOT NULL,
  contractor_id UUID NOT NULL,
  
  -- Material details
  material_name VARCHAR(255) NOT NULL,
  material_category VARCHAR(100),
  material_unit VARCHAR(20) NOT NULL,
  description TEXT,
  
  -- Drawing context
  drawing_file_name VARCHAR(255),
  drawing_reference VARCHAR(100),
  
  -- Contractor's calculations
  nos INTEGER DEFAULT 1,
  length DECIMAL(10,3),
  breadth DECIMAL(10,3), 
  height DECIMAL(10,3),
  contractor_quantity DECIMAL(10,3) NOT NULL,
  contractor_notes TEXT,
  
  -- Admin verification
  admin_verified_quantity DECIMAL(10,3),
  variance_percentage DECIMAL(5,2),
  verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'disputed', 'revision_required')),
  admin_notes TEXT,
  verified_by UUID, -- admin user id
  verified_at TIMESTAMP,
  
  -- Funding eligibility (only set after verification)
  is_funding_eligible BOOLEAN DEFAULT FALSE,
  estimated_rate DECIMAL(10,2),
  estimated_amount DECIMAL(15,2),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_takeoff_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_takeoff_contractor FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE
);

-- Table to track which takeoff items have been exported to project materials after verification
CREATE TABLE IF NOT EXISTS verified_material_exports (
  id SERIAL PRIMARY KEY,
  takeoff_item_id INTEGER NOT NULL,
  project_material_id INTEGER, -- Reference to project_materials table
  exported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_export_takeoff FOREIGN KEY (takeoff_item_id) REFERENCES takeoff_items(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_takeoff_items_project ON takeoff_items(project_id);
CREATE INDEX IF NOT EXISTS idx_takeoff_items_contractor ON takeoff_items(contractor_id);
CREATE INDEX IF NOT EXISTS idx_takeoff_items_verification_status ON takeoff_items(verification_status);
CREATE INDEX IF NOT EXISTS idx_takeoff_items_funding_eligible ON takeoff_items(is_funding_eligible);
CREATE INDEX IF NOT EXISTS idx_takeoff_items_created_at ON takeoff_items(created_at);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_takeoff_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_takeoff_items_updated_at 
    BEFORE UPDATE ON takeoff_items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_takeoff_items_updated_at();

-- Function to calculate variance percentage
CREATE OR REPLACE FUNCTION calculate_takeoff_variance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.admin_verified_quantity IS NOT NULL AND NEW.contractor_quantity > 0 THEN
        NEW.variance_percentage = ((NEW.admin_verified_quantity - NEW.contractor_quantity) / NEW.contractor_quantity) * 100;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_takeoff_variance_trigger
    BEFORE UPDATE OF admin_verified_quantity ON takeoff_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_takeoff_variance();

-- Function to set funding eligibility when verified
CREATE OR REPLACE FUNCTION update_funding_eligibility()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.verification_status = 'verified' AND OLD.verification_status != 'verified' THEN
        NEW.is_funding_eligible = TRUE;
        -- Use admin verified quantity if available, otherwise contractor quantity
        IF NEW.admin_verified_quantity IS NOT NULL THEN
            NEW.estimated_amount = NEW.admin_verified_quantity * COALESCE(NEW.estimated_rate, 0);
        ELSE
            NEW.estimated_amount = NEW.contractor_quantity * COALESCE(NEW.estimated_rate, 0);
        END IF;
    ELSIF NEW.verification_status != 'verified' THEN
        NEW.is_funding_eligible = FALSE;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_funding_eligibility_trigger
    BEFORE UPDATE OF verification_status ON takeoff_items
    FOR EACH ROW
    EXECUTE FUNCTION update_funding_eligibility();