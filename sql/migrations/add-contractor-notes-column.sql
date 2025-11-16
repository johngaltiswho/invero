-- Add missing contractor_notes column to project_materials table
-- This column is used to store contractor notes when submitting to Finverno

ALTER TABLE project_materials 
ADD COLUMN contractor_notes TEXT;

-- Add comment for clarity
COMMENT ON COLUMN project_materials.contractor_notes IS 'Notes added by contractor when submitting materials to Finverno for approval';