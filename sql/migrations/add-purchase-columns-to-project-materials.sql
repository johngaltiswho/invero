-- Add purchase-related columns to project_materials table
-- These columns are needed for the purchase request submission API

ALTER TABLE project_materials 
ADD COLUMN purchase_status VARCHAR DEFAULT 'pending' CHECK (purchase_status IN ('pending', 'purchase_request_raised', 'approved_for_funding', 'completed', 'rejected')),
ADD COLUMN quoted_rate DECIMAL(10,2),
ADD COLUMN tax_percentage DECIMAL(5,2),
ADD COLUMN tax_amount DECIMAL(10,2),
ADD COLUMN total_amount DECIMAL(10,2),
ADD COLUMN purchase_invoice_url TEXT,
ADD COLUMN submitted_at TIMESTAMP WITH TIME ZONE;

-- Add comments for clarity
COMMENT ON COLUMN project_materials.purchase_status IS 'Status of purchase request: pending, purchase_request_raised, approved_for_funding, completed, rejected';
COMMENT ON COLUMN project_materials.quoted_rate IS 'Rate quoted by contractor for purchase request';
COMMENT ON COLUMN project_materials.tax_percentage IS 'Tax percentage applied to the quoted rate';
COMMENT ON COLUMN project_materials.tax_amount IS 'Total tax amount calculated';
COMMENT ON COLUMN project_materials.total_amount IS 'Total amount including tax for purchase request';
COMMENT ON COLUMN project_materials.purchase_invoice_url IS 'URL of uploaded purchase invoice file';
COMMENT ON COLUMN project_materials.submitted_at IS 'Timestamp when purchase request was submitted';