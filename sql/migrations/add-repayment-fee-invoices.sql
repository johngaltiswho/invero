ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_kind VARCHAR(24) NOT NULL DEFAULT 'supply'
    CHECK (invoice_kind IN ('supply', 'repayment_fee')),
  ADD COLUMN IF NOT EXISTS capital_transaction_id UUID REFERENCES capital_transactions(id) ON DELETE SET NULL;

UPDATE invoices
SET invoice_kind = 'supply'
WHERE invoice_kind IS NULL OR invoice_kind = '';

CREATE INDEX IF NOT EXISTS idx_invoices_kind_created_at
  ON invoices(invoice_kind, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_capital_transaction_id
  ON invoices(capital_transaction_id)
  WHERE capital_transaction_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_repayment_fee_transaction_unique
  ON invoices(capital_transaction_id, invoice_kind)
  WHERE capital_transaction_id IS NOT NULL AND invoice_kind = 'repayment_fee';

COMMENT ON COLUMN invoices.invoice_kind IS
  'supply = material supply invoice, repayment_fee = project participation fee invoice generated after repayment.';

COMMENT ON COLUMN invoices.capital_transaction_id IS
  'Links repayment-fee invoices to the capital return transaction that triggered them.';
