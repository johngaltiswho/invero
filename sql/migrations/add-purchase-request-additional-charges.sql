-- Add request-level additional charges for purchase requests

CREATE TABLE IF NOT EXISTS purchase_request_additional_charges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_request_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    hsn_code VARCHAR(20),
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    tax_percent DECIMAL(5,2) DEFAULT 0 CHECK (tax_percent >= 0 AND tax_percent <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_request_additional_charges_request_id
    ON purchase_request_additional_charges(purchase_request_id);

ALTER TABLE purchase_request_additional_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage charges for accessible requests" ON purchase_request_additional_charges
    FOR ALL USING (
        purchase_request_id IN (
            SELECT id FROM purchase_requests WHERE contractor_id IN (
                SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
            )
        )
    );

CREATE POLICY "Service role has full purchase request charge access" ON purchase_request_additional_charges
    FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER update_purchase_request_additional_charges_updated_at
    BEFORE UPDATE ON purchase_request_additional_charges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE purchase_request_additional_charges IS 'Request-level commercial charges such as transport or loading for purchase requests';
