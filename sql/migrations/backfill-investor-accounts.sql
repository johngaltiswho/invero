-- Backfill investor_accounts rows and recompute balances from existing capital transactions

-- Ensure every investor has an account row
INSERT INTO investor_accounts (investor_id)
SELECT id
FROM investors
WHERE id NOT IN (SELECT investor_id FROM investor_accounts)
ON CONFLICT (investor_id) DO NOTHING;

-- Recalculate balances based on historical transactions
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
  deployed_capital = COALESCE(tx.total_deployment, 0),
  returned_capital = COALESCE(tx.total_return, 0),
  available_balance = COALESCE(tx.total_inflow, 0)
                      - COALESCE(tx.total_deployment, 0)
                      + COALESCE(tx.total_return, 0)
                      - COALESCE(tx.total_withdrawal, 0),
  updated_at = NOW()
FROM tx_summary tx
WHERE ia.investor_id = tx.investor_id;
