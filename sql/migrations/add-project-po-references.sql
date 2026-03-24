CREATE TABLE IF NOT EXISTS project_po_references (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  po_number VARCHAR NOT NULL,
  po_date DATE,
  po_value DECIMAL(14, 2),
  po_type VARCHAR(24) NOT NULL DEFAULT 'original'
    CHECK (po_type IN ('original', 'amendment', 'supplemental', 'replacement')),
  status VARCHAR(24) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'exhausted', 'closed')),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  previous_po_reference_id UUID REFERENCES project_po_references(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (project_id, po_number)
);

CREATE INDEX IF NOT EXISTS idx_project_po_references_project_id
  ON project_po_references(project_id);

CREATE INDEX IF NOT EXISTS idx_project_po_references_project_status
  ON project_po_references(project_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_po_references_default
  ON project_po_references(project_id)
  WHERE is_default = TRUE;

ALTER TABLE purchase_requests
  ADD COLUMN IF NOT EXISTS project_po_reference_id UUID REFERENCES project_po_references(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_requests_project_po_reference_id
  ON purchase_requests(project_po_reference_id);

ALTER TABLE project_po_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors can view own project PO references" ON project_po_references
  FOR SELECT USING (
    project_id IN (
      SELECT p.id
      FROM projects p
      JOIN contractors c ON c.id = p.contractor_id
      WHERE c.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Contractors can insert own project PO references" ON project_po_references
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id
      FROM projects p
      JOIN contractors c ON c.id = p.contractor_id
      WHERE c.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Contractors can update own project PO references" ON project_po_references
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id
      FROM projects p
      JOIN contractors c ON c.id = p.contractor_id
      WHERE c.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Service role full access on project PO references" ON project_po_references
  FOR ALL USING (true);

DROP TRIGGER IF EXISTS update_project_po_references_updated_at ON project_po_references;
CREATE TRIGGER update_project_po_references_updated_at
  BEFORE UPDATE ON project_po_references
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

UPDATE projects
SET po_number = NULL
WHERE po_number IS NOT NULL AND btrim(po_number) = '';

INSERT INTO project_po_references (
  project_id,
  po_number,
  po_type,
  status,
  is_default,
  created_at,
  updated_at
)
SELECT
  p.id,
  p.po_number,
  'original',
  CASE
    WHEN COALESCE(p.project_status, 'draft') IN ('awarded', 'finalized', 'completed') THEN 'active'
    ELSE 'closed'
  END,
  TRUE,
  COALESCE(p.created_at, NOW()),
  COALESCE(p.updated_at, NOW())
FROM projects p
WHERE p.po_number IS NOT NULL
  AND btrim(p.po_number) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM project_po_references pr
    WHERE pr.project_id = p.id
      AND pr.po_number = p.po_number
  );

UPDATE purchase_requests pr
SET project_po_reference_id = default_ref.id
FROM (
  SELECT DISTINCT ON (project_id)
    id,
    project_id
  FROM project_po_references
  ORDER BY project_id, is_default DESC, created_at ASC
) AS default_ref
WHERE pr.project_id = default_ref.project_id::text
  AND pr.project_po_reference_id IS NULL;

COMMENT ON TABLE project_po_references IS 'Client commercial PO references linked to a project execution scope';
COMMENT ON COLUMN project_po_references.is_default IS 'Default active PO used to preselect funding for new purchase requests';
COMMENT ON COLUMN purchase_requests.project_po_reference_id IS 'Funding PO reference selected for this purchase request';
