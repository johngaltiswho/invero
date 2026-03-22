ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS po_number VARCHAR;

CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_po_number ON projects(po_number);

COMMENT ON COLUMN projects.client_id IS 'Optional normalized client reference linked to the clients table';
COMMENT ON COLUMN projects.po_number IS 'Client PO/WO number captured on awarded project creation';
