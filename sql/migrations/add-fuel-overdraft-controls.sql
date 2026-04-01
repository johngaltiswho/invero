ALTER TABLE contractor_fuel_settings
  ADD COLUMN IF NOT EXISTS overdraft_allowed BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS overdraft_limit_amount DECIMAL(12,2) NOT NULL DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS warning_threshold_amount DECIMAL(12,2) NOT NULL DEFAULT 5000;

UPDATE contractor_fuel_settings
SET
  overdraft_allowed = CASE
    WHEN account_mode = 'credit' THEN true
    ELSE false
  END,
  overdraft_limit_amount = CASE
    WHEN account_mode = 'credit' THEN COALESCE(account_limit_amount, monthly_fuel_budget, 0)
    ELSE 0
  END,
  warning_threshold_amount = CASE
    WHEN COALESCE(account_limit_amount, monthly_fuel_budget, 0) >= 5000 THEN 5000
    ELSE COALESCE(account_limit_amount, monthly_fuel_budget, 0)
  END
WHERE
  overdraft_limit_amount IS NULL
  OR warning_threshold_amount IS NULL;

COMMENT ON COLUMN contractor_fuel_settings.overdraft_allowed IS
  'Whether the SME fuel account may go below zero, treating the negative balance as fuel receivable / overdraft used.';
COMMENT ON COLUMN contractor_fuel_settings.overdraft_limit_amount IS
  'Maximum allowed negative balance for the SME fuel account.';
COMMENT ON COLUMN contractor_fuel_settings.warning_threshold_amount IS
  'Threshold near zero / overdraft usage used for UI warnings on the unified fuel balance.';
