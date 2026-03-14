-- Add project-level shipping address and purchase-request shipping snapshot

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_address TEXT;

ALTER TABLE purchase_requests
  ADD COLUMN IF NOT EXISTS shipping_location TEXT;

COMMENT ON COLUMN projects.project_address IS 'Primary project/site address';
COMMENT ON COLUMN purchase_requests.shipping_location IS 'Ship-to address snapshot captured at purchase request time';

-- Backfill project shipping address from client address where available.
UPDATE projects p
SET project_address = c.address
FROM clients c
WHERE p.client_id = c.id
  AND COALESCE(NULLIF(TRIM(p.project_address), ''), '') = ''
  AND COALESCE(NULLIF(TRIM(c.address), ''), '') <> '';

-- Fallback for older projects that only have client_name.
UPDATE projects p
SET project_address = c.address
FROM clients c
WHERE LOWER(TRIM(p.client_name)) = LOWER(TRIM(c.name))
  AND p.contractor_id = c.contractor_id
  AND COALESCE(NULLIF(TRIM(p.project_address), ''), '') = ''
  AND COALESCE(NULLIF(TRIM(c.address), ''), '') <> '';

-- Backfill purchase request shipping snapshots from project/client metadata.
UPDATE purchase_requests pr
SET shipping_location = COALESCE(
  NULLIF(TRIM(p.project_address), ''),
  NULLIF(TRIM(c.address), ''),
  NULLIF(TRIM(p.location), '')
)
FROM projects p
LEFT JOIN clients c
  ON (p.client_id = c.id)
  OR (
    p.contractor_id = c.contractor_id
    AND LOWER(TRIM(COALESCE(p.client_name, ''))) = LOWER(TRIM(COALESCE(c.name, '')))
  )
WHERE pr.project_id = p.id
  AND COALESCE(NULLIF(TRIM(pr.shipping_location), ''), '') = '';
