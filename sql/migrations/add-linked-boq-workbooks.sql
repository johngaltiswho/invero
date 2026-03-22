CREATE TABLE IF NOT EXISTS boq_linked_workbooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  provider VARCHAR(32) NOT NULL DEFAULT 'google'
    CHECK (provider IN ('microsoft', 'google')),
  original_file_path TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  original_content_type TEXT,
  provider_file_id TEXT,
  provider_drive_id TEXT,
  provider_site_id TEXT,
  provider_web_url TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'source_uploaded'
    CHECK (status IN ('source_uploaded', 'linked', 'link_failed', 'syncing', 'synced', 'sync_failed')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  last_sync_status VARCHAR(32)
    CHECK (last_sync_status IN ('success', 'failed')),
  last_sync_error TEXT,
  last_synced_boq_id UUID REFERENCES project_boqs(id) ON DELETE SET NULL,
  metadata JSONB,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boq_linked_workbooks_project_id
  ON boq_linked_workbooks(project_id);

CREATE INDEX IF NOT EXISTS idx_boq_linked_workbooks_project_active
  ON boq_linked_workbooks(project_id, active);

ALTER TABLE boq_linked_workbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors can view own linked boq workbooks" ON boq_linked_workbooks
  FOR SELECT USING (
    contractor_id IN (
      SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Contractors can insert own linked boq workbooks" ON boq_linked_workbooks
  FOR INSERT WITH CHECK (
    contractor_id IN (
      SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Contractors can update own linked boq workbooks" ON boq_linked_workbooks
  FOR UPDATE USING (
    contractor_id IN (
      SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Service role full access on linked boq workbooks" ON boq_linked_workbooks
  FOR ALL USING (true);

DROP TRIGGER IF EXISTS update_boq_linked_workbooks_updated_at ON boq_linked_workbooks;
CREATE TRIGGER update_boq_linked_workbooks_updated_at
  BEFORE UPDATE ON boq_linked_workbooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE boq_linked_workbooks IS 'Linked cloud workbooks used as the editable BOQ working surface';
COMMENT ON COLUMN boq_linked_workbooks.original_file_path IS 'Original uploaded workbook stored unchanged in private storage';
COMMENT ON COLUMN boq_linked_workbooks.provider_web_url IS 'Provider URL for editing the linked workbook';
