'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components';

type AgreementType = 'master_platform' | 'financing_addendum' | 'procurement_declaration';

type Agreement = {
  id: string;
  status: string;
  agreement_type: AgreementType;
  agreement_date: string;
  company_signatory_name?: string | null;
  company_signatory_title?: string | null;
  notes?: string | null;
  issued_at?: string | null;
  contractor_signed_at?: string | null;
  executed_at?: string | null;
};

type AgreementFiles = {
  draft_url?: string | null;
  signed_url?: string | null;
  executed_url?: string | null;
};

type DeliveryLog = {
  id: string;
  recipient_email: string;
  delivery_status: string;
  sent_at?: string | null;
};

type Props = {
  contractorId: string;
  contractorEmail: string;
  agreementType: AgreementType;
  title: string;
  description: string;
  onUpdated?: () => Promise<void> | void;
};

export default function ContractorAgreementPanel({
  contractorId,
  contractorEmail,
  agreementType,
  title,
  description,
  onUpdated,
}: Props): React.ReactElement {
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [files, setFiles] = useState<AgreementFiles>({});
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [form, setForm] = useState({
    agreement_date: new Date().toISOString().slice(0, 10),
    company_signatory_name: 'Authorized Signatory',
    company_signatory_title: 'Director',
    notes: '',
  });
  const [savedForm, setSavedForm] = useState({
    agreement_date: new Date().toISOString().slice(0, 10),
    company_signatory_name: 'Authorized Signatory',
    company_signatory_title: 'Director',
    notes: '',
  });
  const [isEditing, setIsEditing] = useState(true);
  const uploadRef = useRef<HTMLInputElement | null>(null);

  const loadAgreement = useCallback(async () => {
    try {
      setLoading(true);
      const listRes = await fetch(`/api/admin/contractor-agreements?contractor_id=${contractorId}&agreement_type=${agreementType}`);
      const listData = await listRes.json();
      if (!listRes.ok) {
        throw new Error(listData.error || 'Failed to load agreements');
      }

      const latest = (listData.agreements || [])[0] || null;
      if (!latest) {
        setAgreement(null);
        setFiles({});
        setDeliveryLogs([]);
        const emptyForm = {
          agreement_date: new Date().toISOString().slice(0, 10),
          company_signatory_name: 'Authorized Signatory',
          company_signatory_title: 'Director',
          notes: '',
        };
        setForm(emptyForm);
        setSavedForm(emptyForm);
        setIsEditing(true);
        return;
      }

      const detailRes = await fetch(`/api/admin/contractor-agreements/${latest.id}`);
      const detailData = await detailRes.json();
      if (!detailRes.ok) {
        throw new Error(detailData.error || 'Failed to load agreement detail');
      }

      setAgreement(detailData.agreement);
      setFiles(detailData.files || {});
      setDeliveryLogs(detailData.deliveryLogs || []);
      const nextForm = {
        agreement_date: detailData.agreement.agreement_date || new Date().toISOString().slice(0, 10),
        company_signatory_name: detailData.agreement.company_signatory_name || 'Authorized Signatory',
        company_signatory_title: detailData.agreement.company_signatory_title || 'Director',
        notes: detailData.agreement.notes || '',
      };
      setForm(nextForm);
      setSavedForm(nextForm);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to load contractor agreement:', error);
    } finally {
      setLoading(false);
    }
  }, [agreementType, contractorId]);

  useEffect(() => {
    loadAgreement();
  }, [loadAgreement]);

  const requestJson = async (url: string, options?: RequestInit) => {
    const response = await fetch(url, options);
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Request failed');
    }
    return result;
  };

  const refresh = async () => {
    await loadAgreement();
    await onUpdated?.();
  };

  const handleCreate = async () => {
    try {
      setProcessing('create');
      await requestJson('/api/admin/contractor-agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractor_id: contractorId,
          agreement_type: agreementType,
          agreement_date: form.agreement_date,
          company_signatory_name: form.company_signatory_name,
          company_signatory_title: form.company_signatory_title,
          notes: form.notes || null,
        }),
      });
      await refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create agreement');
    } finally {
      setProcessing(null);
    }
  };

  const handleGenerate = async () => {
    if (!agreement) return;
    try {
      setProcessing('generate');
      await requestJson(`/api/admin/contractor-agreements/${agreement.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      await refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to generate agreement');
    } finally {
      setProcessing(null);
    }
  };

  const handleIssueAndSend = async () => {
    if (!agreement) return;
    try {
      setProcessing('issue-send');
      if (agreement.status === 'generated') {
        await requestJson(`/api/admin/contractor-agreements/${agreement.id}/issue`, { method: 'POST' });
      }
      await requestJson(`/api/admin/contractor-agreements/${agreement.id}/send`, { method: 'POST' });
      await refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to issue and send agreement');
    } finally {
      setProcessing(null);
    }
  };

  const handleVoid = async () => {
    if (!agreement) return;
    const reason = window.prompt('Reason for voiding this agreement?') || '';
    try {
      setProcessing('void');
      await requestJson(`/api/admin/contractor-agreements/${agreement.id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      await refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to void agreement');
    } finally {
      setProcessing(null);
    }
  };

  const handleExecute = async () => {
    if (!agreement) return;
    try {
      setProcessing('execute');
      await requestJson(`/api/admin/contractor-agreements/${agreement.id}/execute`, { method: 'POST' });
      await refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to execute agreement');
    } finally {
      setProcessing(null);
    }
  };

  const handleUploadSigned = async (file: File | null) => {
    if (!agreement || !file) return;
    try {
      setProcessing('upload');
      const formData = new FormData();
      formData.append('file', file);
      const signerName = window.prompt('SME signatory name') || '';
      if (signerName) {
        formData.append('signer_name', signerName);
      }
      formData.append('signer_email', contractorEmail);

      const response = await fetch(`/api/admin/contractor-agreements/${agreement.id}/upload-signed`, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload signed agreement');
      }
      await refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to upload signed agreement');
    } finally {
      setProcessing(null);
      if (uploadRef.current) {
        uploadRef.current.value = '';
      }
    }
  };

  const statusLabel = agreement?.status ? agreement.status.replace(/_/g, ' ').toUpperCase() : 'NOT STARTED';

  return (
    <div className="bg-neutral-darker/60 border border-neutral-medium rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-primary">{title}</h3>
          <p className="text-xs text-secondary">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {agreement && ['draft', 'generated', 'issued'].includes(agreement.status) && isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setForm(savedForm);
                setIsEditing(false);
              }}
              disabled={processing !== null || loading}
            >
              Cancel
            </Button>
          )}
          {agreement && ['draft', 'generated', 'issued'].includes(agreement.status) && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              disabled={processing !== null || loading}
            >
              Edit Details
            </Button>
          )}
          <span className="px-3 py-1 rounded border border-neutral-medium text-xs text-accent-orange">
            {loading ? 'LOADING' : statusLabel}
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 text-sm mb-4">
        <label className="block">
          <span className="text-secondary">Agreement Date</span>
          <input
            type="date"
            value={form.agreement_date}
            onChange={(event) => setForm((prev) => ({ ...prev, agreement_date: event.target.value }))}
            disabled={(!!agreement && !isEditing) || loading || processing !== null}
            className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary"
          />
        </label>
        <label className="block">
          <span className="text-secondary">Company Signatory Name</span>
          <input
            type="text"
            value={form.company_signatory_name}
            onChange={(event) => setForm((prev) => ({ ...prev, company_signatory_name: event.target.value }))}
            disabled={(!!agreement && !isEditing) || loading || processing !== null}
            className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary"
          />
        </label>
        <label className="block">
          <span className="text-secondary">Company Signatory Title</span>
          <input
            type="text"
            value={form.company_signatory_title}
            onChange={(event) => setForm((prev) => ({ ...prev, company_signatory_title: event.target.value }))}
            disabled={(!!agreement && !isEditing) || loading || processing !== null}
            className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary"
          />
        </label>
      </div>

      <label className="block text-sm mb-4">
        <span className="text-secondary">Notes</span>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
          disabled={(!!agreement && !isEditing) || loading || processing !== null}
          className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary"
        />
      </label>

      <div className="flex flex-wrap gap-3 mb-4">
        {!agreement && (
          <Button variant="primary" size="sm" onClick={handleCreate} disabled={processing !== null || loading}>
            {processing === 'create' ? 'Creating...' : 'Create Draft'}
          </Button>
        )}
        {agreement && ['draft', 'generated', 'issued'].includes(agreement.status) && (
          <Button variant="primary" size="sm" onClick={handleGenerate} disabled={processing !== null}>
            {processing === 'generate' ? 'Generating...' : agreement.status === 'issued' ? 'Generate Updated Draft PDF' : 'Generate Draft PDF'}
          </Button>
        )}
        {agreement && ['generated', 'issued'].includes(agreement.status) && (
          <Button variant="primary" size="sm" onClick={handleIssueAndSend} disabled={processing !== null}>
            {processing === 'issue-send' ? 'Sending...' : agreement.status === 'issued' ? 'Re-send Notification' : 'Issue & Notify SME'}
          </Button>
        )}
        {agreement && ['draft', 'generated', 'issued', 'contractor_signed'].includes(agreement.status) && (
          <Button variant="outline" size="sm" onClick={handleVoid} disabled={processing !== null}>
            {processing === 'void' ? 'Voiding...' : 'Void'}
          </Button>
        )}
        {agreement && ['issued', 'contractor_signed'].includes(agreement.status) && (
          <>
            <input
              ref={uploadRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => handleUploadSigned(event.target.files?.[0] || null)}
            />
            <Button variant="secondary" size="sm" onClick={() => uploadRef.current?.click()} disabled={processing !== null}>
              {processing === 'upload' ? 'Uploading...' : 'Upload SME Signed Copy (Fallback)'}
            </Button>
          </>
        )}
        {agreement?.status === 'contractor_signed' && (
          <Button variant="primary" size="sm" onClick={handleExecute} disabled={processing !== null}>
            {processing === 'execute' ? 'Executing...' : 'Countersign & Execute'}
          </Button>
        )}
      </div>

      {agreement?.status === 'issued' && (
        <div className="mb-4 rounded-lg border border-accent-blue/30 bg-accent-blue/10 p-4 text-sm text-secondary">
          Once issued, the contractor can sign this agreement directly in the portal. Use the upload action only if you need to record an offline signed PDF as a fallback.
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4 mb-4 text-sm">
        <div className="rounded-lg border border-neutral-medium p-4">
          <div className="text-secondary mb-1">Draft PDF</div>
          {files.draft_url ? <a href={files.draft_url} target="_blank" rel="noreferrer" className="text-accent-orange hover:underline">View Draft PDF</a> : <span className="text-secondary">Not generated</span>}
        </div>
        <div className="rounded-lg border border-neutral-medium p-4">
          <div className="text-secondary mb-1">Signed Copy</div>
          {files.signed_url ? <a href={files.signed_url} target="_blank" rel="noreferrer" className="text-accent-orange hover:underline">View Signed Copy</a> : <span className="text-secondary">Not uploaded</span>}
        </div>
        <div className="rounded-lg border border-neutral-medium p-4">
          <div className="text-secondary mb-1">Executed Copy</div>
          {files.executed_url ? <a href={files.executed_url} target="_blank" rel="noreferrer" className="text-accent-orange hover:underline">View Executed Copy</a> : <span className="text-secondary">Not executed</span>}
        </div>
      </div>

      <div className="rounded-lg border border-neutral-medium p-4 text-sm">
        <div className="font-medium text-primary mb-2">Delivery Log</div>
        {deliveryLogs.length === 0 ? (
          <p className="text-secondary">No delivery attempts recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {deliveryLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-4 text-secondary">
                <span>{log.recipient_email}</span>
                <span>{log.sent_at ? new Date(log.sent_at).toLocaleString() : 'Pending'}</span>
                <span className="text-accent-orange uppercase">{log.delivery_status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
