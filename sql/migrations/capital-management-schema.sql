-- Capital Management System Schema
-- Tracks investor capital inflows, deployments, returns, and withdrawals

-- 1. Investor Accounts (capital balances per investor)
CREATE TABLE IF NOT EXISTS investor_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID REFERENCES investors(id) ON DELETE CASCADE,
    total_committed DECIMAL(15,2) DEFAULT 0,
    available_balance DECIMAL(15,2) DEFAULT 0,
    deployed_capital DECIMAL(15,2) DEFAULT 0,
    returned_capital DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(investor_id)
);

-- 2. Capital Transactions (all money movements)
CREATE TABLE IF NOT EXISTS capital_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID REFERENCES investors(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('inflow', 'deployment', 'return', 'withdrawal')),
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL, -- optional, for deployment/return transactions
    contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL, -- optional, for tracking contractor
    contractor_name VARCHAR(255), -- for display purposes
    project_name VARCHAR(255), -- for display purposes  
    description TEXT NOT NULL,
    reference_number VARCHAR(100), -- bank reference, transaction ID, etc.
    admin_user_id VARCHAR(255) NOT NULL, -- Clerk user ID of admin who created this transaction
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Project Deployments (detailed tracking of capital deployed to specific projects)
CREATE TABLE IF NOT EXISTS project_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID REFERENCES investors(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    amount_deployed DECIMAL(15,2) NOT NULL CHECK (amount_deployed > 0),
    deployment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_return_date DATE,
    expected_return_amount DECIMAL(15,2),
    actual_return_date DATE,
    actual_return_amount DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    admin_deployed_by VARCHAR(255) NOT NULL, -- Clerk user ID of admin
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_investor_accounts_investor_id ON investor_accounts(investor_id);
CREATE INDEX IF NOT EXISTS idx_capital_transactions_investor_id ON capital_transactions(investor_id);
CREATE INDEX IF NOT EXISTS idx_capital_transactions_type ON capital_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_capital_transactions_date ON capital_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_project_deployments_investor_id ON project_deployments(investor_id);
CREATE INDEX IF NOT EXISTS idx_project_deployments_project_id ON project_deployments(project_id);

-- Enable Row Level Security
ALTER TABLE investor_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_deployments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin access only for now)
CREATE POLICY "Admin full access to investor_accounts"
    ON investor_accounts FOR ALL USING (true);

CREATE POLICY "Admin full access to capital_transactions"
    ON capital_transactions FOR ALL USING (true);

CREATE POLICY "Admin full access to project_deployments" 
    ON project_deployments FOR ALL USING (true);

-- Functions for automatic balance updates
CREATE OR REPLACE FUNCTION update_investor_account_balances()
RETURNS TRIGGER AS $$
BEGIN
    -- Update account balances based on transaction type
    IF NEW.status = 'completed' THEN
        IF NEW.transaction_type = 'inflow' THEN
            -- Add to available balance and total committed
            UPDATE investor_accounts 
            SET 
                total_committed = total_committed + NEW.amount,
                available_balance = available_balance + NEW.amount,
                updated_at = NOW()
            WHERE investor_id = NEW.investor_id;
            
        ELSIF NEW.transaction_type = 'deployment' THEN
            -- Subtract from available balance, add to deployed capital
            UPDATE investor_accounts 
            SET 
                available_balance = available_balance - NEW.amount,
                deployed_capital = deployed_capital + NEW.amount,
                updated_at = NOW()
            WHERE investor_id = NEW.investor_id;
            
        ELSIF NEW.transaction_type = 'return' THEN
            -- Subtract from deployed capital, add to available balance and returned capital
            UPDATE investor_accounts 
            SET 
                deployed_capital = deployed_capital - NEW.amount,
                available_balance = available_balance + NEW.amount,
                returned_capital = returned_capital + NEW.amount,
                updated_at = NOW()
            WHERE investor_id = NEW.investor_id;
            
        ELSIF NEW.transaction_type = 'withdrawal' THEN
            -- Subtract from available balance
            UPDATE investor_accounts 
            SET 
                available_balance = available_balance - NEW.amount,
                updated_at = NOW()
            WHERE investor_id = NEW.investor_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic balance updates
CREATE OR REPLACE TRIGGER trigger_update_investor_balances
    AFTER INSERT OR UPDATE ON capital_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_investor_account_balances();

-- Function to create investor account when investor is created
CREATE OR REPLACE FUNCTION create_investor_account()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO investor_accounts (investor_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create investor account
CREATE OR REPLACE TRIGGER trigger_create_investor_account
    AFTER INSERT ON investors
    FOR EACH ROW
    EXECUTE FUNCTION create_investor_account();

-- Add updated_at triggers for all tables
CREATE OR REPLACE TRIGGER update_investor_accounts_updated_at 
    BEFORE UPDATE ON investor_accounts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_capital_transactions_updated_at 
    BEFORE UPDATE ON capital_transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_project_deployments_updated_at 
    BEFORE UPDATE ON project_deployments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create investor accounts for existing investors
INSERT INTO investor_accounts (investor_id)
SELECT id FROM investors
WHERE id NOT IN (SELECT investor_id FROM investor_accounts)
ON CONFLICT (investor_id) DO NOTHING;

-- Insert some sample capital transactions for testing
INSERT INTO capital_transactions (investor_id, transaction_type, amount, description, admin_user_id, reference_number) 
VALUES 
    ((SELECT id FROM investors WHERE email = 'rajesh.sharma@email.com' LIMIT 1), 'inflow', 5000000, 'Initial capital commitment - Wire transfer', 'admin_001', 'TXN_001_2024'),
    ((SELECT id FROM investors WHERE email = 'priya.mehta@email.com' LIMIT 1), 'inflow', 10000000, 'Capital infusion for Q4 projects', 'admin_001', 'TXN_002_2024'),
    ((SELECT id FROM investors WHERE email = 'rajesh.sharma@email.com' LIMIT 1), 'deployment', 1500000, 'Deployed to TechnoMax automation project for material procurement', 'admin_001', 'DEP_001_2024')
ON CONFLICT DO NOTHING;