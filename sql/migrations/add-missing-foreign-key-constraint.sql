-- Add missing foreign key constraint between project_materials and contractors
-- The API code expects this constraint to be named 'materials_requested_by_fkey'

-- Add the foreign key constraint with the specific name expected by the API
ALTER TABLE project_materials 
ADD CONSTRAINT materials_requested_by_fkey 
FOREIGN KEY (contractor_id) REFERENCES contractors(id);

-- Also ensure we have the proper constraint name for vendor relationship if needed
-- (Check if this is also used in the API)
-- ALTER TABLE project_materials 
-- ADD CONSTRAINT materials_vendor_id_fkey 
-- FOREIGN KEY (vendor_id) REFERENCES vendors(id);