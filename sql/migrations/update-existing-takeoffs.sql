-- Update existing boq_takeoffs records to have default verification_status
UPDATE boq_takeoffs 
SET verification_status = 'none' 
WHERE verification_status IS NULL;