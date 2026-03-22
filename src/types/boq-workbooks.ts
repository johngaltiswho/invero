export type LinkedBoqWorkbookStatus =
  | 'source_uploaded'
  | 'linked'
  | 'link_failed'
  | 'syncing'
  | 'synced'
  | 'sync_failed';

export type BoqSyncWriteMode = 'new_revision' | 'overwrite';

export interface LinkedBoqWorkbook {
  id: string;
  project_id: string;
  contractor_id: string;
  provider: 'microsoft' | 'google';
  original_file_path: string;
  original_file_name: string;
  original_content_type: string | null;
  provider_file_id: string | null;
  provider_drive_id: string | null;
  provider_site_id: string | null;
  provider_web_url: string | null;
  status: LinkedBoqWorkbookStatus;
  active: boolean;
  last_synced_at: string | null;
  last_sync_status: 'success' | 'failed' | null;
  last_sync_error: string | null;
  last_synced_boq_id: string | null;
  metadata: Record<string, any> | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoqSyncResult {
  workbook_id: string;
  write_mode: BoqSyncWriteMode;
  boq_id: string;
  boq_file_name: string;
  total_sheets: number;
  rows_analyzed: number;
  sections_detected: number;
  synced_at: string;
}
