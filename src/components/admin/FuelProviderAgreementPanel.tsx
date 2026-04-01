'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components';

type Agreement = {
  id: string;
  status: string;
  agreement_date: string;
  company_signatory_name?: string | null;
  company_signatory_title?: string | null;
  notes?: string | null;
  issued_at?: string | null;
  provider_signed_at?: string | null;
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
  pumpId: string;
  pumpName: string;
  pumpEmail?: string | null;
};

export default function FuelProviderAgreementPanel({
  pumpId,
  pumpName,
  pumpEmail,
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
  const [savedForm, setSavedForm] = useState(form);
  const [isEditing, setIsEditing] = useState(true);
  const uploadRef = useRef<HTMLInputElement | null>(null);

  const loadAgreement = useCallback(async () => {
    try {
      setLoading(true);
      const listRes = await fetch(`/api/admin/fuel-provider-agreements?pump_id=${pumpId}`);
      const listData = await listRes.json();
      if (!listRes.ok) throw new Error(listData.error || 'Failed to load agreements');

      const latest = (listData.agreements || [])[0] || null;
      if (!latest) {
        setAgreement(null);
        setFiles({});
        setDeliveryLogs([]);
        const nextForm = {
          agreement_date: new Date().toISOString().slice(0, 10),
          company_signatory_name: 'Authorized Signatory',
          company_signatory_title: 'Director',
          notes: '',
        };
        setForm(nextForm);
        setSavedForm(nextForm);
        setIsEditing(true);
        return;
      }

      const detailRes = await fetch(`/api/admin/fuel-provider-agreements/${latest.id}`);
      const detailData = await detailRes.json();
      if (!detailRes.ok) throw new Error(detailData.error || 'Failed to load agreement detail');

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
      console.error('Failed to load fuel provider agreement:', error);
    } finally {
      setLoading(false);
    }
  }, [pumpId]);

  useEffect(() => {
    loadAgreement();
  }, [loadAgreement]);

  const requestJson = async (url: string, options?: RequestInit) => {
    const response = await fetch(url, options);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Request failed');
    return result;
  };

  const handleCreate = async () => {
    try {
      setProcessing('create');
      await requestJson('/api/admin/fuel-provider-agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pump_id: pumpId,
          agreement_date: form.agreement_date,
          company_signatory_name: form.company_signatory_name,
          company_signatory_title: form.company_signatory_title,
          notes: form.notes || null,
        }),
      });
      await loadAgreement();
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
      await requestJson(`/api/admin/fuel-provider-agreements/${agreement.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      await loadAgreement();
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
        await requestJson(`/api/admin/fuel-provider-agreements/${agreement.id}/issue`, { method: 'POST' });
      }
      await requestJson(`/api/admin/fuel-provider-agreements/${agreement.id}/send`, { method: 'POST' });
      await loadAgreement();
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
      await requestJson(`/api/admin/fuel-provider-agreements/${agreement.id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      await loadAgreement();
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
      await requestJson(`/api/admin/fuel-provider-agreements/${agreement.id}/execute`, { method: 'POST' });
      await loadAgreement();
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
      const signerName = window.prompt('Fuel provider signatory name') || '';
      if (signerName) formData.append('signer_name', signerName);
      if (pumpEmail) formData.append('signer_email', pumpEmail);
      const response = await fetch(`/api/admin/fuel-provider-agreements/${agreement.id}/upload-signed`, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to upload signed agreement');
      await loadAgreement();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to upload signed agreement');
    } finally {
      setProcessing(null);
      if (uploadRef.current) uploadRef.current.value = '';
    }
  };

  const statusLabel = agreement?.status ? agreement.status.replace(/_/g, ' ').toUpperCase() : 'NOT STARTED';

  return (
    <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-primary">Fuel Provider Agreement</h3>
          <p className="text-sm text-secondary mt-1">{pumpName}</p>
        </div>
        <span className="px-3 py-1 rounded border text-sm border-neutral-medium text-primary">
          {statusLabel}
        </span>
      </div>

      {loading ? (
        <div className="text-sm text-secondary mt-4">Loading agreement...</div>
      ) : (
        <div className="space-y-5 mt-5">
          <div className="grid md:grid-cols-4 gap-4 text-sm">
            <label className="block">
              <span className="text-secondary">Agreement Date</span>
              <input
                type="date"
                value={form.agreement_date}
                onChange={(event) => setForm((prev) => ({ ...prev, agreement_date: event.target.value }))}
                disabled={!isEditing}
                className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-darker text-primary"
              />
            </label>
            <label className="block">
              <span className="text-secondary">Company Signatory</span>
              <input
                type="text"
                value={form.company_signatory_name}
                onChange={(event) => setForm((prev) => ({ ...prev, company_signatory_name: event.target.value }))}
                disabled={!isEditing}
                className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-darker text-primary"
              />
            </label>
            <label className="block">
              <span className="text-secondary">Title</span>
              <input
                type="text"
                value={form.company_signatory_title}
                onChange={(event) => setForm((prev) => ({ ...prev, company_signatory_title: event.target.value }))}
                disabled={!isEditing}
                className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-darker text-primary"
              />
            </label>
            <div className="flex items-end gap-2">
              {!agreement ? (
                <Button onClick={handleCreate} disabled={processing === 'create'}>
                  {processing === 'create' ? 'Creating...' : 'Create Draft'}
                </Button>
              ) : isEditing ? (
                <>
                  <Button variant="outline" onClick={() => { setForm(savedForm); setIsEditing(false); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleGenerate} disabled={processing === 'generate'}>
                    {processing === 'generate' ? 'Saving...' : 'Save & Generate'}
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Edit Draft
                </Button>
              )}
            </div>
          </div>

          <label className="block text-sm">
            <span className="text-secondary">Notes</span>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              disabled={!isEditing}
              rows={3}
              className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-darker text-primary"
            />
          </label>

          {agreement ? (
            <>
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleGenerate} disabled={processing === 'generate' || isEditing}>
                  {processing === 'generate' ? 'Generating...' : 'Generate PDF'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleIssueAndSend}
                  disabled={processing === 'issue-send' || !files.draft_url || !pumpEmail}
                >
                  {processing === 'issue-send' ? 'Sending...' : agreement.status === 'issued' ? 'Resend Email' : 'Issue & Send'}
                </Button>
                <label className="inline-flex">
                  <input
                    ref={uploadRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(event) => handleUploadSigned(event.target.files?.[0] || null)}
                  />
                  <span className="inline-flex items-center px-4 py-2 rounded-lg border border-neutral-medium text-primary cursor-pointer hover:bg-neutral-darker">
                    {processing === 'upload' ? 'Uploading...' : 'Upload Signed Copy'}
                  </span>
                </label>
                <Button
                  variant="outline"
                  onClick={handleExecute}
                  disabled={processing === 'execute' || agreement.status !== 'provider_signed'}
                >
                  {processing === 'execute' ? 'Executing...' : 'Mark Executed'}
                </Button>
                <Button variant="outline" onClick={handleVoid} disabled={processing === 'void' || agreement.status === 'executed'}>
                  {processing === 'void' ? 'Voiding...' : 'Void'}
                </Button>
              </div>

              {!pumpEmail && (
                <p className="text-xs text-accent-orange">Add a contact email on this fuel provider to enable issue/send.</p>
              )}

              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="rounded-lg border border-neutral-medium p-4">
                  <div className="text-secondary mb-1">Draft PDF</div>
                  {files.draft_url ? <a href={files.draft_url} target="_blank" rel="noreferrer" className="text-accent-orange hover:underline">View Draft</a> : <span className="text-secondary">Not generated</span>}
                </div>
                <div className="rounded-lg border border-neutral-medium p-4">
                  <div className="text-secondary mb-1">Signed Copy</div>
                  {files.signed_url ? <a href={files.signed_url} target="_blank" rel="noreferrer" className="text-accent-orange hover:underline">View Signed</a> : <span className="text-secondary">Not uploaded</span>}
                </div>
                <div className="rounded-lg border border-neutral-medium p-4">
                  <div className="text-secondary mb-1">Executed Copy</div>
                  {files.executed_url ? <a href={files.executed_url} target="_blank" rel="noreferrer" className="text-accent-orange hover:underline">View Executed</a> : <span className="text-secondary">Not executed</span>}
                </div>
              </div>

              {deliveryLogs.length > 0 ? (
                <div className="rounded-lg border border-neutral-medium p-4">
                  <div className="text-sm font-semibold text-primary mb-2">Delivery Log</div>
                  <div className="space-y-2 text-sm">
                    {deliveryLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between gap-3">
                        <span className="text-secondary">{log.recipient_email}</span>
                        <span className="text-secondary">{log.sent_at ? new Date(log.sent_at).toLocaleString() : log.delivery_status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
