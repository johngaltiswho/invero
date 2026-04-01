'use client';

import React from 'react';
import { Button } from '@/components';

export type ContractorAgreementCardData = {
  id: string;
  status: string;
  agreement_type: 'master_platform' | 'financing_addendum' | 'procurement_declaration' | 'fuel_procurement_declaration';
  agreement_date: string;
  company_signatory_name?: string | null;
  company_signatory_title?: string | null;
  contractor_signed_name?: string | null;
  contractor_signed_at?: string | null;
  issued_at?: string | null;
  executed_at?: string | null;
};

export type ContractorAgreementCardFiles = {
  draft_url?: string | null;
  signed_url?: string | null;
  executed_url?: string | null;
};

interface Props {
  agreement: ContractorAgreementCardData | null;
  files: ContractorAgreementCardFiles;
  onSigned?: () => Promise<void> | void;
}

const AGREEMENT_LABELS: Record<ContractorAgreementCardData['agreement_type'], string> = {
  master_platform: 'Master SME Platform Agreement',
  financing_addendum: 'Financing / Working Capital Addendum',
  procurement_declaration: 'Procurement / Booking Declaration',
  fuel_procurement_declaration: 'Fuel Procurement & Settlement Declaration',
};

export default function ContractorAgreementStatusCard({ agreement, files, onSigned }: Props): React.ReactElement {
  const [typedName, setTypedName] = React.useState('');
  const [confirmed, setConfirmed] = React.useState(false);
  const [signing, setSigning] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  if (!agreement) {
    return (
      <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
        <h2 className="text-xl font-semibold text-primary mb-2">Agreement Status</h2>
        <p className="text-secondary">Your contractor agreement has not been issued yet.</p>
      </div>
    );
  }

  const canSign = agreement.status === 'issued' && !!files.draft_url;
  const agreementLabel = AGREEMENT_LABELS[agreement.agreement_type] || 'Agreement';

  const handleSign = async () => {
    try {
      setSigning(true);
      setError(null);
      setMessage(null);

      const response = await fetch('/api/contractor/agreement/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreement_id: agreement.id,
          typed_name: typedName,
          confirm_agreement: confirmed,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Failed to sign agreement');
      }

      setMessage('Agreement signed successfully.');
      setConfirmed(false);
      setTypedName('');
      if (onSigned) {
        await onSigned();
      }
    } catch (signError) {
      setError(signError instanceof Error ? signError.message : 'Failed to sign agreement');
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-primary mb-2">Agreement Status</h2>
          <p className="text-secondary">Review and sign your {agreementLabel.toLowerCase()} inside the portal.</p>
        </div>
        <span className="px-3 py-1 rounded border text-xs text-accent-amber bg-accent-amber/10 border-accent-amber/20 uppercase">
          {agreement.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-6 text-sm">
        <div className="rounded-lg bg-neutral-medium/30 p-4">
          <div className="text-secondary mb-1">Agreement</div>
          <div className="text-primary font-semibold">{agreementLabel}</div>
        </div>
        <div className="rounded-lg bg-neutral-medium/30 p-4">
          <div className="text-secondary mb-1">Agreement Date</div>
          <div className="text-primary">{new Date(agreement.agreement_date).toLocaleDateString('en-IN')}</div>
        </div>
        <div className="rounded-lg bg-neutral-medium/30 p-4">
          <div className="text-secondary mb-1">Issued</div>
          <div className="text-primary">{agreement.issued_at ? new Date(agreement.issued_at).toLocaleDateString('en-IN') : '—'}</div>
        </div>
        <div className="rounded-lg bg-neutral-medium/30 p-4">
          <div className="text-secondary mb-1">Executed</div>
          <div className="text-primary">{agreement.executed_at ? new Date(agreement.executed_at).toLocaleDateString('en-IN') : '—'}</div>
        </div>
      </div>

      {agreement.status === 'executed' && (
        <div className="mb-6 rounded-lg border border-success/30 bg-success/10 p-4 text-sm">
          <div className="font-medium text-primary">Finverno countersigned the agreement</div>
          <div className="mt-2 text-secondary">
            Countersigned by {agreement.company_signatory_name || 'Authorized Signatory'}
            {agreement.company_signatory_title ? `, ${agreement.company_signatory_title}` : ''}
            {agreement.executed_at ? ` on ${new Date(agreement.executed_at).toLocaleString('en-IN')}` : ''}.
          </div>
        </div>
      )}

      {agreement.status === 'generated' && (
        <div className="mb-6 rounded-lg border border-accent-blue/30 bg-accent-blue/10 p-4 text-sm text-secondary">
          Finverno has prepared this agreement draft. Signing will open here once the agreement is formally issued to your company.
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {files.draft_url && (
          <a href={files.draft_url} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">View Draft</Button>
          </a>
        )}
        {files.signed_url && (
          <a href={files.signed_url} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">View Signed Copy</Button>
          </a>
        )}
        {files.executed_url && (
          <a href={files.executed_url} target="_blank" rel="noreferrer">
            <Button variant="primary" size="sm">View Executed Agreement</Button>
          </a>
        )}
      </div>

      {(message || error) && (
        <div className={`mt-6 rounded-lg border px-4 py-3 text-sm ${error ? 'border-error/30 bg-error/10 text-error' : 'border-success/30 bg-success/10 text-success'}`}>
          {error || message}
        </div>
      )}

      {canSign && (
        <div className="mt-6 rounded-lg border border-neutral-medium p-5">
          <h3 className="mb-2 text-lg font-semibold text-primary">Sign In Portal</h3>
          <p className="mb-4 text-sm text-secondary">
            Type your full legal name and confirm below to submit your signature. Finverno will countersign after your acceptance.
          </p>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-primary">Typed Signature</label>
            <input
              type="text"
              value={typedName}
              onChange={(event) => setTypedName(event.target.value)}
              placeholder="Enter full legal name"
              className="w-full rounded-md border border-neutral-medium bg-neutral-darker px-3 py-2 text-primary"
            />
          </div>

          <label className="mb-5 flex items-start gap-3 text-sm text-secondary">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1"
            />
            <span>
              I have reviewed this agreement, I am authorized to sign on behalf of the SME, and I agree to submit this electronic signature through the Finverno portal.
            </span>
          </label>

          <Button onClick={handleSign} disabled={signing || !typedName.trim() || !confirmed}>
            {signing ? 'Signing...' : 'I Agree And Sign'}
          </Button>
        </div>
      )}

      {(agreement.status === 'contractor_signed' || agreement.status === 'executed') && (
        <div className="mt-6 rounded-lg border border-neutral-medium p-5 text-sm">
          <div className="font-medium text-primary">
            {agreement.status === 'executed' ? 'Agreement fully executed' : 'Contractor signature recorded'}
          </div>
          <div className="mt-2 text-secondary">
            Signed by {agreement.contractor_signed_name || 'Contractor'}
            {agreement.contractor_signed_at ? ` on ${new Date(agreement.contractor_signed_at).toLocaleString('en-IN')}` : ''}.
          </div>
          {agreement.status === 'contractor_signed' && (
            <div className="mt-2 text-secondary">
              Finverno will countersign next. The agreement will move to executed once the company signature is completed.
            </div>
          )}
          {agreement.status === 'executed' && (
            <div className="mt-2 text-secondary">
              Finverno countersigned this agreement as {agreement.company_signatory_name || 'Authorized Signatory'}
              {agreement.company_signatory_title ? `, ${agreement.company_signatory_title}` : ''}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
