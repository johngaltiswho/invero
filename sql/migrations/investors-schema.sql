-- Create investors table for managing investor access
CREATE TABLE IF NOT EXISTS investors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    investor_type VARCHAR(50) NOT NULL CHECK (investor_type IN ('Individual', 'HNI', 'Family Office', 'Institutional')),
    phone VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255) -- Clerk user ID of admin who created this investor
);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_investors_email ON investors(email);
CREATE INDEX IF NOT EXISTS idx_investors_status ON investors(status);

-- Add RLS (Row Level Security)
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Admin full access to investors"
    ON investors
    FOR ALL
    USING (true); -- We'll handle admin access in the application layer

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_investors_updated_at 
    BEFORE UPDATE ON investors 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add some sample data for testing (optional)
INSERT INTO investors (email, name, investor_type, phone, status, notes) VALUES 
    ('investor1@example.com', 'John Doe', 'Individual', '+91-9876543210', 'active', 'High value individual investor'),
    ('investor2@example.com', 'Jane Smith', 'HNI', '+91-9876543211', 'active', 'Family office representative'),
    ('test@invero.com', 'Test Investor', 'Individual', '+91-9876543212', 'pending', 'Test account for development')
ON CONFLICT (email) DO NOTHING;