-- Prevent deployed_capital from going negative when returns include fees/yield
CREATE OR REPLACE FUNCTION update_investor_account_balances()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' THEN
        IF NEW.transaction_type = 'inflow' THEN
            UPDATE investor_accounts
            SET
                total_committed = total_committed + NEW.amount,
                available_balance = available_balance + NEW.amount,
                updated_at = NOW()
            WHERE investor_id = NEW.investor_id;

        ELSIF NEW.transaction_type = 'deployment' THEN
            UPDATE investor_accounts
            SET
                available_balance = available_balance - NEW.amount,
                deployed_capital = deployed_capital + NEW.amount,
                updated_at = NOW()
            WHERE investor_id = NEW.investor_id;

        ELSIF NEW.transaction_type = 'return' THEN
            UPDATE investor_accounts
            SET
                deployed_capital = GREATEST(deployed_capital - NEW.amount, 0),
                available_balance = available_balance + NEW.amount,
                returned_capital = returned_capital + NEW.amount,
                updated_at = NOW()
            WHERE investor_id = NEW.investor_id;

        ELSIF NEW.transaction_type = 'withdrawal' THEN
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

-- Recalculate balances with return clamping
WITH tx_summary AS (
  SELECT
    investor_id,
    SUM(CASE WHEN transaction_type = 'inflow' AND status = 'completed' THEN amount ELSE 0 END) AS total_inflow,
    SUM(CASE WHEN transaction_type = 'deployment' AND status = 'completed' THEN amount ELSE 0 END) AS total_deployment,
    SUM(CASE WHEN transaction_type = 'return' AND status = 'completed' THEN amount ELSE 0 END) AS total_return,
    SUM(CASE WHEN transaction_type = 'withdrawal' AND status = 'completed' THEN amount ELSE 0 END) AS total_withdrawal
  FROM capital_transactions
  GROUP BY investor_id
)
UPDATE investor_accounts ia
SET
  total_committed = COALESCE(tx.total_inflow, 0),
  deployed_capital = GREATEST(COALESCE(tx.total_deployment, 0) - COALESCE(tx.total_return, 0), 0),
  returned_capital = COALESCE(tx.total_return, 0),
  available_balance = COALESCE(tx.total_inflow, 0)
                      - COALESCE(tx.total_deployment, 0)
                      + COALESCE(tx.total_return, 0)
                      - COALESCE(tx.total_withdrawal, 0),
  updated_at = NOW()
FROM tx_summary tx
WHERE ia.investor_id = tx.investor_id;
