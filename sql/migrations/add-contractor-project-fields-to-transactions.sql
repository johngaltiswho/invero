-- Add contractor and project fields to existing capital_transactions table
-- Run this migration to add the new columns without recreating the table

-- Add contractor_id column (foreign key to contractors)
ALTER TABLE capital_transactions 
ADD COLUMN IF NOT EXISTS contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL;

-- Add contractor_name column (for display purposes)
ALTER TABLE capital_transactions 
ADD COLUMN IF NOT EXISTS contractor_name VARCHAR(255);

-- Add project_name column (for display purposes - project_id should already exist)
ALTER TABLE capital_transactions 
ADD COLUMN IF NOT EXISTS project_name VARCHAR(255);

-- Add index for better performance on contractor lookups
CREATE INDEX IF NOT EXISTS idx_capital_transactions_contractor_id ON capital_transactions(contractor_id);

-- Update existing sample data to include contractor information where applicable
UPDATE capital_transactions 
SET contractor_name = 'TechnoMax Solutions Pvt Ltd',
    project_name = 'Manufacturing Automation Project'
WHERE description LIKE '%TechnoMax%' AND contractor_name IS NULL;