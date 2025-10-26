-- Vendors table schema
CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  contractor_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  gst_number VARCHAR(15),
  specialties TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint (contractors table uses UUID)
  CONSTRAINT fk_vendor_contractor 
    FOREIGN KEY (contractor_id) 
    REFERENCES contractors(id) 
    ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vendors_contractor_id ON vendors(contractor_id);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);
CREATE INDEX IF NOT EXISTS idx_vendors_gst_number ON vendors(gst_number);

-- Add unique constraint for GST number (should be globally unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_unique_gst 
ON vendors(gst_number) 
WHERE gst_number IS NOT NULL AND gst_number != '';

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vendors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vendors_updated_at 
    BEFORE UPDATE ON vendors 
    FOR EACH ROW 
    EXECUTE FUNCTION update_vendors_updated_at();