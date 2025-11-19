-- Link capital transactions and project deployments to purchase requests
ALTER TABLE capital_transactions 
    ADD COLUMN IF NOT EXISTS purchase_request_id UUID REFERENCES purchase_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_capital_transactions_purchase_request_id 
    ON capital_transactions(purchase_request_id);

ALTER TABLE project_deployments 
    ADD COLUMN IF NOT EXISTS purchase_request_id UUID REFERENCES purchase_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_project_deployments_purchase_request_id 
    ON project_deployments(purchase_request_id);
