'use client';

import { useEffect, useState } from 'react';

type WorkbookPanelProps = {
  projectId: string;
  hasMeasurementRows: boolean;
  onBoqSynced?: () => void;
  refreshToken?: number;
};

type WorkbookData = {
  id: string;
  original_file_name: string;
  original_file_url: string | null;
  provider_web_url: string | null;
  status: string;
  last_synced_at: string | null;
  last_sync_error: string | null;
  created_at: string;
};

type LatestBoq = {
  id: string;
  file_name: string;
  created_at: string;
  total_amount: number;
} | null;

export default function LinkedBOQWorkbookPanel({
  projectId,
  hasMeasurementRows,
  onBoqSynced,
  refreshToken = 0,
}: WorkbookPanelProps) {
  const [workbook, setWorkbook] = useState<WorkbookData | null>(null);
  const [latestBoq, setLatestBoq] = useState<LatestBoq>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  const loadWorkbook = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/boq-workbooks`, { cache: 'no-store' });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to load workbook metadata');
      }

      setWorkbook(payload.data.workbook);
      setLatestBoq(payload.data.latest_boq);
    } catch (error) {
      console.error('Failed to load linked workbook panel:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to load workbook metadata');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkbook();
  }, [projectId, refreshToken]);

  const handleSourceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/projects/${projectId}/boq-workbooks`, {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to upload workbook');
      }

      setWorkbook(payload.data.workbook);
      setMessage(payload.data.warning || 'Google working sheet created successfully.');
    } catch (error) {
      console.error('Failed to upload source workbook:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to upload source workbook');
    } finally {
      setUploading(false);
      event.target.value = '';
      loadWorkbook();
    }
  };

  const handleCreateWorkingWorkbook = async () => {
    if (!workbook) return;
    setCreating(true);
    setMessage('');

    try {
      const response = await fetch(`/api/projects/${projectId}/boq-workbooks/${workbook.id}/create`, {
        method: 'POST',
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to create working workbook');
      }

      setWorkbook(payload.data.workbook);
      setMessage('Working workbook is ready in Google Sheets.');
    } catch (error) {
      console.error('Failed to create working workbook:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to create working workbook');
    } finally {
      setCreating(false);
      loadWorkbook();
    }
  };

  const handleSync = async () => {
    if (!workbook) return;

    const createNewRevision = window.confirm('Create a new BOQ revision from the latest workbook? Click Cancel to review overwrite instead.');
    let writeMode: 'new_revision' | 'overwrite' | null = createNewRevision ? 'new_revision' : null;

    if (!writeMode) {
      const overwriteCurrent = window.confirm('Overwrite the current parsed BOQ revision with the latest workbook?');
      writeMode = overwriteCurrent ? 'overwrite' : null;
    }

    if (!writeMode) return;

    setSyncing(true);
    setMessage('');

    try {
      const response = await fetch(`/api/projects/${projectId}/boq-workbooks/${workbook.id}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ write_mode: writeMode }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to sync workbook');
      }

      setMessage(
        writeMode === 'new_revision'
          ? 'Google working sheet synced into a new BOQ revision.'
          : 'Google working sheet synced by overwriting the active BOQ revision.'
      );
      onBoqSynced?.();
      await loadWorkbook();
    } catch (error) {
      console.error('Failed to sync workbook:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to sync workbook');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-primary">Linked Working Workbook</h3>
          <p className="text-sm text-secondary">
            Keep the original BOQ workbook intact, edit the working copy in Google Sheets, and sync the latest workbook back into Finverno.
          </p>
        </div>
        <label className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          uploading ? 'bg-neutral-medium text-secondary cursor-not-allowed' : 'bg-accent-amber text-neutral-dark hover:bg-accent-amber/90 cursor-pointer'
        }`}>
          {uploading ? 'Uploading...' : workbook ? 'Replace Source Workbook' : 'Create Working Workbook'}
          <input type="file" accept=".xlsx,.xls" className="hidden" disabled={uploading} onChange={handleSourceUpload} />
        </label>
      </div>

      {message && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          message.toLowerCase().includes('failed') || message.toLowerCase().includes('error')
            ? 'border-red-500/40 bg-red-500/10 text-red-300'
            : 'border-success/30 bg-success/10 text-success'
        }`}>
          {message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-neutral-medium bg-neutral-darker/50 p-4">
          <div className="text-xs uppercase tracking-wide text-secondary mb-2">Original Workbook</div>
          <div className="text-sm text-primary font-medium">
            {workbook?.original_file_name || 'No workbook uploaded yet'}
          </div>
          {workbook?.original_file_url ? (
            <a href={workbook.original_file_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-accent-amber hover:underline">
              Download Original Workbook
            </a>
          ) : (
            <div className="mt-3 text-xs text-secondary">The uploaded client workbook is preserved unchanged here.</div>
          )}
        </div>

        <div className="rounded-lg border border-neutral-medium bg-neutral-darker/50 p-4">
          <div className="text-xs uppercase tracking-wide text-secondary mb-2">Working Workbook</div>
          <div className="text-sm text-primary font-medium">
            {workbook?.provider_web_url ? 'Google Sheets working copy is ready' : 'No working workbook link yet'}
          </div>
          <div className="mt-2 text-xs text-secondary">
            Status: {loading ? 'Loading...' : workbook?.status || 'Not created'}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {workbook?.provider_web_url ? (
              <a
                href={workbook.provider_web_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-lg bg-accent-blue px-3 py-2 text-sm font-medium text-white hover:bg-accent-blue/90"
              >
                Open Working Sheet
              </a>
            ) : workbook ? (
              <button
                onClick={handleCreateWorkingWorkbook}
                disabled={creating}
                className="inline-flex items-center rounded-lg bg-accent-blue px-3 py-2 text-sm font-medium text-white hover:bg-accent-blue/90 disabled:opacity-60"
              >
                {creating ? 'Creating...' : 'Create Working Workbook'}
              </button>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-neutral-medium bg-neutral-darker/50 p-4">
          <div className="text-xs uppercase tracking-wide text-secondary mb-2">Parsed BOQ Revision</div>
          <div className="text-sm text-primary font-medium">
            {latestBoq?.file_name || 'No parsed BOQ revision yet'}
          </div>
          <div className="mt-2 text-xs text-secondary">
            {latestBoq?.created_at
              ? `Last revision: ${new Date(latestBoq.created_at).toLocaleString('en-IN')}`
              : 'Sync the workbook to create or refresh the normalized BOQ revision.'}
          </div>
          <div className="mt-2 text-xs text-secondary">
            {workbook?.last_synced_at
              ? `Last synced: ${new Date(workbook.last_synced_at).toLocaleString('en-IN')}`
              : 'Workbook not synced yet'}
          </div>
        </div>
      </div>

      {workbook?.last_sync_error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {workbook.last_sync_error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleSync}
          disabled={!workbook?.provider_web_url || syncing || hasMeasurementRows}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            !workbook?.provider_web_url || syncing || hasMeasurementRows
              ? 'bg-neutral-medium text-secondary cursor-not-allowed'
              : 'bg-accent-amber text-neutral-dark hover:bg-accent-amber/90'
          }`}
        >
          {syncing ? 'Syncing Workbook...' : 'Sync Latest BOQ'}
        </button>
        <div className="text-xs text-secondary">
          {hasMeasurementRows
            ? 'Measurement has started, so BOQ sync is locked to protect the active baseline.'
            : 'Sync reads the latest Google working sheet and writes it back as a new BOQ revision or an explicit overwrite.'}
        </div>
      </div>
    </div>
  );
}
