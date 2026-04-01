ALTER TABLE contractor_fuel_settings
  ADD COLUMN IF NOT EXISTS account_mode VARCHAR(20) NOT NULL DEFAULT 'credit'
    CHECK (account_mode IN ('cash_carry', 'credit')),
  ADD COLUMN IF NOT EXISTS account_limit_amount DECIMAL(12,2) NOT NULL DEFAULT 50000;

UPDATE contractor_fuel_settings
SET account_limit_amount = COALESCE(account_limit_amount, monthly_fuel_budget)
WHERE account_limit_amount IS NULL OR account_limit_amount = 0;

COMMENT ON COLUMN contractor_fuel_settings.account_mode IS 'Unified SME fuel account mode: cash_carry uses prepaid balance semantics, credit uses outstanding/limit semantics.';
COMMENT ON COLUMN contractor_fuel_settings.account_limit_amount IS 'Unified available balance / credit headroom cap used by the fuel account.';

CREATE TABLE IF NOT EXISTS fuel_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type VARCHAR(24) NOT NULL CHECK (owner_type IN ('contractor', 'fuel_pump')),
  owner_id UUID NOT NULL,
  account_kind VARCHAR(32) NOT NULL CHECK (account_kind IN ('sme_fuel', 'provider_settlement')),
  mode VARCHAR(24) NOT NULL CHECK (mode IN ('cash_carry', 'credit', 'settlement')),
  status VARCHAR(24) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (owner_type, owner_id, account_kind)
);

CREATE TABLE IF NOT EXISTS fuel_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES fuel_accounts(id) ON DELETE CASCADE,
  entry_type VARCHAR(40) NOT NULL CHECK (
    entry_type IN (
      'fuel_fill_charge',
      'platform_fee_charge',
      'daily_fee_accrual',
      'sme_payment',
      'provider_payable',
      'provider_settlement',
      'adjustment'
    )
  ),
  direction VARCHAR(8) NOT NULL CHECK (direction IN ('debit', 'credit')),
  amount DECIMAL(14,2) NOT NULL CHECK (amount >= 0),
  reference_type VARCHAR(40) NOT NULL CHECK (
    reference_type IN (
      'fuel_approval',
      'sme_payment',
      'provider_settlement_batch',
      'manual_adjustment'
    )
  ),
  reference_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fuel_ledger_entries_account_created
  ON fuel_ledger_entries(account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fuel_ledger_entries_reference
  ON fuel_ledger_entries(reference_type, reference_id);

CREATE TABLE IF NOT EXISTS fuel_settlement_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pump_id UUID NOT NULL REFERENCES fuel_pumps(id) ON DELETE CASCADE,
  batch_code VARCHAR(40) NOT NULL UNIQUE,
  total_amount DECIMAL(14,2) NOT NULL CHECK (total_amount >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'paid' CHECK (status IN ('draft', 'paid', 'cancelled')),
  settled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fuel_settlement_batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES fuel_settlement_batches(id) ON DELETE CASCADE,
  ledger_entry_id UUID NOT NULL REFERENCES fuel_ledger_entries(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (batch_id, ledger_entry_id),
  UNIQUE (ledger_entry_id)
);

DROP TRIGGER IF EXISTS fuel_accounts_updated_at ON fuel_accounts;
CREATE TRIGGER fuel_accounts_updated_at
  BEFORE UPDATE ON fuel_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS fuel_settlement_batches_updated_at ON fuel_settlement_batches;
CREATE TRIGGER fuel_settlement_batches_updated_at
  BEFORE UPDATE ON fuel_settlement_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE fuel_accounts IS 'Unified SME and fuel provider accounts for the fuel workflow.';
COMMENT ON TABLE fuel_ledger_entries IS 'Immutable ledger entries for fuel fills, fees, payments, and settlements.';
COMMENT ON TABLE fuel_settlement_batches IS 'Manual provider settlement batches recorded by admin.';
COMMENT ON TABLE fuel_settlement_batch_items IS 'Links provider payable ledger entries to settlement batches.';
