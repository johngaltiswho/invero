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
  lender_sleeve_id?: string | null;
  agreement_model_type?: 'fixed_debt' | 'pool_participation' | null;
  superseded_at?: string | null;
  superseded_reason?: string | null;
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
  created_at?: string;
  updated_at?: string;
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
  const [agreementList, setAgreementList] = useState<Agreement[]>([]);
  const [historyList, setHistoryList] = useState<Agreement[]>([]);
  const [selectedAgreementId, setSelectedAgreementId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
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

      const allAgreements = listData.agreements || [];
      const currentAgreements = allAgreements.filter(
        (item: Agreement) => !item.superseded_at && !['voided', 'expired'].includes(item.status)
      );
      const historicalAgreements = allAgreements.filter(
        (item: Agreement) => item.superseded_at || ['voided', 'expired'].includes(item.status)
      );

      setAgreementList(currentAgreements);
      setHistoryList(historicalAgreements);

      const latest =
        currentAgreements.find((item: Agreement) => item.id === selectedAgreementId) ||
        currentAgreements[0] ||
        null;
      if (!latest) {
        setAgreement(null);
        setSelectedAgreementId(null);
        setFiles({});
        setDeliveryLogs([]);
        setForm(getDefaultFormForInvestor(investor));
        return;
      }
      setSelectedAgreementId(latest.id);

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
      setAgreementList([]);
      setHistoryList([]);
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
  }, [investor.id, selectedAgreementId]);

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

  const handleRenew = async () => {
    try {
      setProcessing('renew');
      await requestJson('/api/admin/investor-agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investor_id: investor.id,
          lender_sleeve_id: agreement?.lender_sleeve_id || null,
          agreement_model_type: agreement?.agreement_model_type || 'pool_participation',
          commitment_amount: Number(form.commitment_amount) || Number(agreement?.commitment_amount) || 100000,
          agreement_date: new Date().toISOString().slice(0, 10),
          investor_pan: form.investor_pan || agreement?.investor_pan || investor.pan_number || null,
          investor_address: form.investor_address || agreement?.investor_address || investor.address || null,
          company_signatory_name: form.company_signatory_name || agreement?.company_signatory_name || defaultForm.company_signatory_name,
          company_signatory_title: form.company_signatory_title || agreement?.company_signatory_title || defaultForm.company_signatory_title,
          notes: form.notes || agreement?.notes || null,
        }),
      });
      await loadAgreement();
      setShowDraftModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to renew agreement');
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

  const handleIssueAndSend = async () => {
    if (!agreement) return;
    try {
      setProcessing('issue-send');
      if (agreement.status === 'generated') {
        await requestJson(`/api/admin/investor-agreements/${agreement.id}/issue`, { method: 'POST' });
      }
      await requestJson(`/api/admin/investor-agreements/${agreement.id}/send`, { method: 'POST' });
      await loadAgreement();
      alert(`Agreement notification sent to ${investor.email}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to notify investor');
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

  const handleCountersign = async () => {
    if (!agreement) return;
    try {
      setProcessing('execute');
      await requestJson(`/api/admin/investor-agreements/${agreement.id}/execute`, {
        method: 'POST',
      });
      await loadAgreement();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to countersign agreement');
    } finally {
      setProcessing(null);
    }
  };

  const canEditDraft = !agreement || ['draft', 'generated', 'issued'].includes(agreement.status);
  const canVoidAgreement = !!agreement && ['draft', 'generated', 'issued'].includes(agreement.status);
  const canReplaceBeforeFunding = !!agreement && agreement.status === 'executed';
  const canGenerateDraft = !!agreement && ['draft', 'generated', 'issued'].includes(agreement.status);
  const canNotifyInvestor = !!agreement && ['generated', 'issued'].includes(agreement.status);
  const canCountersign = !!agreement && agreement.status === 'investor_signed';
  const primaryAction =
    canReplaceBeforeFunding ? 'replace' :
    canCountersign ? 'execute' :
    canNotifyInvestor ? 'notify' :
    canGenerateDraft ? 'generate' :
    null;
  const getAgreementLabel = (item: Agreement) =>
    item.agreement_model_type === 'fixed_debt' ? 'Fixed Debt Sleeve' : 'Pool Participation Sleeve';
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

  const stateNotice =
    agreement?.status === 'draft'
      ? 'Draft stage: edit terms, generate the PDF, then issue it to the investor. No investor action is possible until the draft is issued.'
      : agreement?.status === 'generated'
        ? 'Draft PDF is ready. Review it, then issue and notify the investor when you want this agreement to become the current live document.'
        : agreement?.status === 'issued'
          ? 'This agreement has been sent but not yet signed. You can still edit terms, regenerate the draft, or void this draft before the investor signs.'
          : agreement?.status === 'investor_signed'
            ? 'Investor signature is complete. The next valid step is countersign and execute. Do not replace or void this agreement now.'
            : agreement?.status === 'executed'
              ? 'This is the current executed agreement for the sleeve. If terms must change before funding, use Replace Before Funding and the old agreement will move to history automatically.'
              : null;

  const renderHistory = () =>
    historyList.length > 0 ? (
      <div className="rounded-lg border border-neutral-medium p-4">
        <button
          type="button"
          onClick={() => setHistoryOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div>
            <div className="text-sm font-medium text-primary">Agreement History</div>
            <div className="text-xs text-secondary">
              Older agreements are archived automatically for audit.
            </div>
          </div>
          <div className="text-xs text-secondary">
            {historyList.length} historical · {historyOpen ? 'Hide' : 'Show'}
          </div>
        </button>
        {historyOpen && (
          <div className="mt-4 space-y-3">
            {historyList.map((item) => (
              <div key={item.id} className="rounded-lg border border-neutral-medium bg-neutral-medium/10 p-3 text-sm">
                <div className="font-medium text-primary">
                  {getAgreementLabel(item)} · {(Number(item.commitment_amount) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-secondary">
                  Status: {statusLabelMap[item.status] || item.status.replace(/_/g, ' ')}
                  {item.superseded_at ? ` · Superseded ${new Date(item.superseded_at).toLocaleDateString('en-IN')}` : ''}
                </div>
                {item.superseded_reason && (
                  <div className="mt-1 text-xs text-secondary">{item.superseded_reason}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    ) : null;

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
          <>
            <div className="rounded-lg border border-neutral-medium p-6">
              <div className="mb-2 text-sm text-secondary">
                {historyList.length > 0
                  ? 'No current agreement is active for this investor. Historical agreements remain available below for audit.'
                  : emptyStateMessage}
              </div>
              <div className="mb-4 text-xs text-secondary">
                Step 1: create the draft agreement with investor details and commercial terms.
              </div>
              <Button onClick={() => setShowDraftModal(true)} disabled={processing === 'create'}>
                Create Agreement
              </Button>
            </div>
            {renderHistory()}
          </>
        ) : (
          <>
            {agreementList.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {agreementList.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedAgreementId(item.id)}
                    className={`rounded border px-3 py-2 text-xs uppercase ${
                      item.id === agreement.id
                        ? 'border-accent-amber/30 bg-accent-amber/10 text-accent-amber'
                        : 'border-neutral-medium text-secondary hover:text-primary'
                    }`}
                  >
                    {getAgreementLabel(item)} · {statusLabelMap[item.status] || item.status}
                  </button>
                ))}
              </div>
            )}
            <>
                <div className="grid md:grid-cols-5 gap-4 text-sm">
                  <div className="bg-neutral-medium/30 rounded-lg p-4">
                    <div className="text-secondary mb-1">Sleeve</div>
                    <div className="text-primary font-semibold">{getAgreementLabel(agreement)}</div>
                  </div>
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
                    One current agreement per sleeve. Replace only before funding; otherwise preserve history.
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {canReplaceBeforeFunding && (
                    <Button
                      onClick={handleRenew}
                      disabled={processing === 'renew'}
                      variant={primaryAction === 'replace' ? 'primary' : 'secondary'}
                    >
                      {processing === 'renew' ? 'Creating Replacement Draft...' : 'Replace Before Funding'}
                    </Button>
                  )}
                  {canEditDraft && (
                    <Button
                      variant={primaryAction === null ? 'primary' : 'secondary'}
                      onClick={() => setShowDraftModal(true)}
                      disabled={processing !== null}
                    >
                      Edit Terms
                    </Button>
                  )}
                  {canGenerateDraft && (
                    <Button
                      variant={primaryAction === 'generate' ? 'primary' : 'secondary'}
                      onClick={handleGenerate}
                      disabled={processing === 'generate'}
                    >
                      {processing === 'generate'
                        ? 'Generating...'
                        : agreement.status === 'issued'
                          ? 'Regenerate Draft'
                          : 'Generate Draft'}
                    </Button>
                  )}
                  {canNotifyInvestor && (
                    <Button
                      variant={primaryAction === 'notify' ? 'primary' : 'secondary'}
                      onClick={handleIssueAndSend}
                      disabled={processing === 'issue-send'}
                    >
                      {processing === 'issue-send'
                        ? agreement.status === 'generated'
                          ? 'Issuing & Sending...'
                          : 'Sending...'
                        : agreement.status === 'generated'
                          ? 'Issue & Notify Investor'
                          : 'Re-send Investor Notification'}
                    </Button>
                  )}
                  {canVoidAgreement && (
                    <Button
                      variant="outline"
                      onClick={handleVoid}
                      disabled={processing === 'void'}
                      className="text-error hover:bg-error/10"
                    >
                      {processing === 'void' ? 'Voiding...' : 'Void Draft'}
                    </Button>
                  )}
                  {canCountersign && (
                    <Button
                      variant={primaryAction === 'execute' ? 'primary' : 'secondary'}
                      onClick={handleCountersign}
                      disabled={processing === 'execute'}
                    >
                      {processing === 'execute' ? 'Countersigning...' : 'Countersign & Execute'}
                    </Button>
                  )}
                </div>

                {stateNotice && (
                  <div className="rounded-lg border border-accent-amber/20 bg-accent-amber/10 px-4 py-3 text-sm text-primary">
                    {stateNotice}
                  </div>
                )}

                {!canVoidAgreement && agreement.status !== 'voided' && (
                  <div className="rounded-lg border border-neutral-medium bg-neutral-medium/20 px-4 py-3 text-sm text-secondary">
                    Void is only allowed before investor signature and before any funding activity. Once the agreement is signed or tied to transfer review, preserve it for audit and handle the situation through rejection, supersession, or reversal instead.
                  </div>
                )}

                {renderHistory()}

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
                    <div className="text-sm font-medium text-primary mb-3">Step 3: Investor Signature</div>
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
                    <div className="text-sm font-medium text-primary mb-3">Step 5: Completed Agreement</div>
                    {files.executed_url ? (
                      <a className="text-accent-amber text-sm hover:underline block mb-3" href={files.executed_url} target="_blank" rel="noreferrer">
                        View Completed Agreement
                      </a>
                    ) : (
                      <div className="text-sm text-secondary mb-3">
                        {agreement.status === 'investor_signed'
                          ? 'Investor signature is complete. Finverno must now countersign to finalize execution.'
                          : 'The executed agreement will appear here after investor signing and Finverno countersignature.'}
                      </div>
                    )}
                    <div className="text-xs text-secondary">
                      Portal signing records investor acceptance first. Admin countersignature completes execution.
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
