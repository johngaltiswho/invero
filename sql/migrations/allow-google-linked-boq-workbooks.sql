ALTER TABLE boq_linked_workbooks
  DROP CONSTRAINT IF EXISTS boq_linked_workbooks_provider_check;

ALTER TABLE boq_linked_workbooks
  ADD CONSTRAINT boq_linked_workbooks_provider_check
  CHECK (provider IN ('microsoft', 'google'));

ALTER TABLE boq_linked_workbooks
  ALTER COLUMN provider SET DEFAULT 'google';
