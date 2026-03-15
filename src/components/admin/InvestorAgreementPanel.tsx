'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components';
import GenerateAgreementModal, { type AgreementDraftFormValues } from '@/components/admin/GenerateAgreementModal';

type Investor = {
  id: string;
  email: string;
  name: string;
  pan_number?: string | null;
  address?: string | null;
  agreement_status?: string | null;
  agreement_completed_at?: string | null;
  activation_status?: string | null;
};

type Agreement = {
  id: string;
  status: string;
  commitment_amount: number;
  agreement_date: string;
  investor_pan?: string | null;
  investor_address?: string | null;
  company_signatory_name?: string | null;
  company_signatory_title?: string | null;
  notes?: string | null;
  issued_at?: string | null;
  signed_copy_received_at?: string | null;
  executed_at?: string | null;
  draft_pdf_path?: string | null;
  signed_pdf_path?: string | null;
  executed_pdf_path?: string | null;
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
  subject?: string | null;
};

interface Props {
  investor: Investor;
}

const defaultForm: AgreementDraftFormValues = {
  commitment_amount: '100000',
  agreement_date: new Date().toISOString().slice(0, 10),
  investor_pan: '',
  investor_address: '',
  company_signatory_name: 'Authorized Signatory',
  company_signatory_title: 'Director',
  notes: '',
};

const getDefaultFormForInvestor = (investor: Investor): AgreementDraftFormValues => ({
  ...defaultForm,
  investor_pan: investor.pan_number || '',
  investor_address: investor.address || '',
});

export default function InvestorAgreementPanel({ investor }: Props): React.ReactElement {
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [files, setFiles] = useState<AgreementFiles>({});
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);

  const emptyStateMessage = 'No agreement yet. Create agreement to start this investor workflow.';

  const loadAgreement = async () => {
    try {
      setLoading(true);
      setError(null);
      const listRes = await fetch(`/api/admin/investor-agreements?investor_id=${investor.id}`);
      const listData = await listRes.json();
      if (!listRes.ok) {
        throw new Error(listData.error || 'Failed to load agreements');
      }

      const latest = (listData.agreements || [])[0] || null;
      if (!latest) {
        setAgreement(null);
        setFiles({});
        setDeliveryLogs([]);
        setForm(getDefaultFormForInvestor(investor));
        return;
      }

      const detailRes = await fetch(`/api/admin/investor-agreements/${latest.id}`);
      const detailData = await detailRes.json();
      if (!detailRes.ok) {
        throw new Error(detailData.error || 'Failed to load agreement details');
      }

      setAgreement(detailData.agreement);
      setFiles(detailData.files || {});
      setDeliveryLogs(detailData.deliveryLogs || []);
      setForm({
        commitment_amount: String(Number(detailData.agreement.commitment_amount) || 100000),
        agreement_date: detailData.agreement.agreement_date || defaultForm.agreement_date,
        investor_pan: detailData.agreement.investor_pan || '',
        investor_address: detailData.agreement.investor_address || '',
        company_signatory_name: detailData.agreement.company_signatory_name || defaultForm.company_signatory_name,
        company_signatory_title: detailData.agreement.company_signatory_title || defaultForm.company_signatory_title,
        notes: detailData.agreement.notes || '',
      });
    } catch (err) {
      setAgreement(null);
      setFiles({});
      setDeliveryLogs([]);
      setForm(getDefaultFormForInvestor(investor));
      setError(err instanceof Error ? err.message : 'Failed to load agreement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgreement();
  }, [investor.id]);

  useEffect(() => {
    if (!agreement) {
      setForm(getDefaultFormForInvestor(investor));
    }
  }, [agreement, investor]);

  const requestJson = async (url: string, options?: RequestInit) => {
    const response = await fetch(url, options);
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Request failed');
    }
    return result;
  };

  const handleCreate = async () => {
    try {
      setProcessing('create');
      await requestJson('/api/admin/investor-agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investor_id: investor.id,
          commitment_amount: Number(form.commitment_amount) || 100000,
          agreement_date: form.agreement_date,
          investor_pan: form.investor_pan || null,
          investor_address: form.investor_address || null,
          company_signatory_name: form.company_signatory_name,
          company_signatory_title: form.company_signatory_title,
          notes: form.notes || null,
        }),
      });
      await loadAgreement();
      setShowDraftModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create agreement');
    } finally {
      setProcessing(null);
    }
  };

  const handleGenerate = async () => {
    if (!agreement) return;
    try {
      setProcessing('generate');
      await requestJson(`/api/admin/investor-agreements/${agreement.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitment_amount: Number(form.commitment_amount) || 100000,
          agreement_date: form.agreement_date,
          investor_pan: form.investor_pan || null,
          investor_address: form.investor_address || null,
          company_signatory_name: form.company_signatory_name,
          company_signatory_title: form.company_signatory_title,
          notes: form.notes || null,
        }),
      });
      await loadAgreement();
      setShowDraftModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate agreement');
    } finally {
      setProcessing(null);
    }
  };

  const handleIssue = async () => {
    if (!agreement) return;
    try {
      setProcessing('issue');
      await requestJson(`/api/admin/investor-agreements/${agreement.id}/issue`, { method: 'POST' });
      await loadAgreement();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to issue agreement');
    } finally {
      setProcessing(null);
    }
  };

  const handleSend = async () => {
    if (!agreement) return;
    try {
      setProcessing('send');
      await requestJson(`/api/admin/investor-agreements/${agreement.id}/send`, { method: 'POST' });
      await loadAgreement();
      alert(`Agreement email sent to ${investor.email}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send agreement');
    } finally {
      setProcessing(null);
    }
  };

  const handleVoid = async () => {
    if (!agreement) return;
    const reason = window.prompt('Reason for voiding this agreement?') || '';
    try {
      setProcessing('void');
      await requestJson(`/api/admin/investor-agreements/${agreement.id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      await loadAgreement();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to void agreement');
    } finally {
      setProcessing(null);
    }
  };

  const canEditDraft = !agreement || ['draft', 'generated'].includes(agreement.status);
  const statusLabelMap: Record<string, string> = {
    draft: 'Draft Created',
    generated: 'Draft PDF Ready',
    issued: 'Issued to Investor',
    investor_signed: 'Investor Signed',
    signed_copy_received: 'Investor Signed',
    executed: 'Fully Executed',
    voided: 'Voided',
    expired: 'Expired',
  };

  return (
    <div className="mt-6 bg-neutral-dark rounded-lg border border-neutral-medium">
      <div className="p-6 border-b border-neutral-medium">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Investor Agreement</h3>
            <p className="text-sm text-secondary">Prepare, issue, track signature, and finalize the POC participation agreement for this investor.</p>
            
          </div>
          {agreement && (
            <span className="px-3 py-1 rounded border text-xs text-accent-amber bg-accent-amber/10 border-accent-amber/20 uppercase">
              {statusLabelMap[agreement.status] || agreement.status.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        <GenerateAgreementModal
          isOpen={showDraftModal}
          mode={agreement ? 'edit' : 'create'}
          values={form}
          processing={processing === 'create' || processing === 'generate'}
          onClose={() => setShowDraftModal(false)}
          onChange={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
          onSubmit={agreement ? handleGenerate : handleCreate}
        />

        {error && agreement && (
          <div className="rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-secondary">Loading agreement...</div>
        ) : !agreement ? (
          <div className="rounded-lg border border-neutral-medium p-6">
            <div className="mb-2 text-sm text-secondary">{emptyStateMessage}</div>
            <div className="mb-4 text-xs text-secondary">
              Step 1: create the draft agreement with investor details and commercial terms.
            </div>
            <Button onClick={() => setShowDraftModal(true)} disabled={processing === 'create'}>
              Create Agreement
            </Button>
          </div>
        ) : (
          <>
            <>
                <div className="grid md:grid-cols-5 gap-4 text-sm">
                  <div className="bg-neutral-medium/30 rounded-lg p-4">
                    <div className="text-secondary mb-1">Commitment</div>
                    <div className="text-primary font-semibold">Rs {(Number(agreement.commitment_amount) || 0).toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-neutral-medium/30 rounded-lg p-4">
                    <div className="text-secondary mb-1">Investor PAN</div>
                    <div className="text-primary">{agreement.investor_pan || '—'}</div>
                  </div>
                  <div className="bg-neutral-medium/30 rounded-lg p-4">
                    <div className="text-secondary mb-1">Issued to Investor</div>
                    <div className="text-primary">{agreement.issued_at ? new Date(agreement.issued_at).toLocaleDateString('en-IN') : '—'}</div>
                  </div>
                  <div className="bg-neutral-medium/30 rounded-lg p-4">
                    <div className="text-secondary mb-1">Investor Signature</div>
                    <div className="text-primary">{agreement.signed_copy_received_at ? new Date(agreement.signed_copy_received_at).toLocaleDateString('en-IN') : '—'}</div>
                  </div>
                  <div className="bg-neutral-medium/30 rounded-lg p-4">
                    <div className="text-secondary mb-1">Fully Executed</div>
                    <div className="text-primary">{agreement.executed_at ? new Date(agreement.executed_at).toLocaleDateString('en-IN') : '—'}</div>
                  </div>
                </div>

                <div className="rounded-lg border border-neutral-medium bg-neutral-medium/20 p-4">
                  <div className="text-sm font-medium text-primary mb-2">Workflow</div>
                  <div className="text-sm text-secondary">
                    1. Review or edit draft terms.
                    {' '}2. Generate the draft PDF.
                    {' '}3. Issue the agreement to lock terms.
                    {' '}4. Send it to the investor.
                    {' '}5. Investor logs in and signs in the portal.
                    {' '}6. Agreement is automatically completed and archived.
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setShowDraftModal(true)}
                    disabled={!canEditDraft}
                  >
                    Review / Edit Draft Terms
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={processing === 'generate' || !['draft', 'generated'].includes(agreement.status)}
                  >
                    {processing === 'generate' ? 'Generating...' : 'Generate / Refresh Draft PDF'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleIssue}
                    disabled={processing === 'issue' || !['generated', 'issued'].includes(agreement.status)}
                  >
                    {processing === 'issue' ? 'Issuing...' : 'Issue to Investor'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSend}
                    disabled={processing === 'send' || agreement.status !== 'issued'}
                  >
                    {processing === 'send' ? 'Sending...' : 'Send to Investor'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleVoid}
                    disabled={processing === 'void' || ['executed', 'voided'].includes(agreement.status)}
                    className="text-error hover:bg-error/10"
                  >
                    {processing === 'void' ? 'Voiding...' : 'Void'}
                  </Button>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-neutral-medium p-4">
                    <div className="text-sm font-medium text-primary mb-3">Step 2: Draft PDF</div>
                    {files.draft_url ? (
                      <a className="text-accent-amber text-sm hover:underline" href={files.draft_url} target="_blank" rel="noreferrer">
                        View Draft PDF
                      </a>
                    ) : (
                      <div className="text-sm text-secondary">Not generated yet</div>
                    )}
                  </div>
                  <div className="rounded-lg border border-neutral-medium p-4">
                    <div className="text-sm font-medium text-primary mb-3">Step 5: Investor Signature</div>
                    {files.signed_url ? (
                      <a className="text-accent-amber text-sm hover:underline block mb-3" href={files.signed_url} target="_blank" rel="noreferrer">
                        View Signed Copy
                      </a>
                    ) : (
                      <div className="text-sm text-secondary mb-3">Waiting for the investor to sign in portal after receiving the notification.</div>
                    )}
                    <div className="text-xs text-secondary">
                      Physical or uploaded signed copies are no longer part of this workflow.
                    </div>
                  </div>
                  <div className="rounded-lg border border-neutral-medium p-4">
                    <div className="text-sm font-medium text-primary mb-3">Step 6: Completed Agreement</div>
                    {files.executed_url ? (
                      <a className="text-accent-amber text-sm hover:underline block mb-3" href={files.executed_url} target="_blank" rel="noreferrer">
                        View Completed Agreement
                      </a>
                    ) : (
                      <div className="text-sm text-secondary mb-3">The executed agreement will appear here automatically after in-portal signing.</div>
                    )}
                    <div className="text-xs text-secondary">
                      No admin upload or manual execution step is required in the portal-sign flow.
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-neutral-medium p-4">
                  <div className="text-sm font-medium text-primary mb-3">Delivery Log</div>
                  {deliveryLogs.length === 0 ? (
                    <div className="text-sm text-secondary">No delivery attempts logged yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {deliveryLogs.map((log) => (
                        <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <div className="text-secondary">{log.recipient_email}</div>
                          <div className="text-primary">{log.sent_at ? new Date(log.sent_at).toLocaleString('en-IN') : '—'}</div>
                          <div className="text-accent-amber uppercase">{log.delivery_status}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
            </>
          </>
        )}
      </div>
    </div>
  );
}
