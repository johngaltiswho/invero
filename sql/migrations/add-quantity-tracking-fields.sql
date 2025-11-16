-- Add quantity tracking fields to project_materials table
-- This implements the 2-field addition approach for quantity management

-- Add the two new columns
ALTER TABLE project_materials 
ADD COLUMN available_qty DECIMAL(10,2),
ADD COLUMN requested_qty DECIMAL(10,2);

-- Initialize available_qty with current quantity for existing records
UPDATE project_materials 
SET available_qty = quantity 
WHERE available_qty IS NULL;

-- Add comments for clarity
COMMENT ON COLUMN project_materials.quantity IS 'Original estimated quantity from drawings/BOQ (immutable reference)';
COMMENT ON COLUMN project_materials.available_qty IS 'Current quantity available to order (decreases with approvals)';
COMMENT ON COLUMN project_materials.requested_qty IS 'Quantity in current pending purchase request (temporary)';

-- Add constraint to ensure requested_qty doesn't exceed available_qty
ALTER TABLE project_materials 
ADD CONSTRAINT check_requested_qty_valid 
CHECK (requested_qty IS NULL OR requested_qty <= available_qty);

-- Add index for performance on queries filtering by available quantity
CREATE INDEX IF NOT EXISTS idx_project_materials_available_qty 
ON project_materials(available_qty) 
WHERE available_qty > 0;