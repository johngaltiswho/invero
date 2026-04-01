DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname
  INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'contractor_agreements'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%agreement_type%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE contractor_agreements DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE contractor_agreements
  ADD CONSTRAINT contractor_agreements_agreement_type_check
  CHECK (agreement_type IN ('master_platform', 'financing_addendum', 'procurement_declaration', 'fuel_procurement_declaration'));

COMMENT ON CONSTRAINT contractor_agreements_agreement_type_check ON contractor_agreements IS
  'Allowed contractor agreement types including the SME fuel procurement declaration.';
