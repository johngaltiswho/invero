'use client';

import React from 'react';
import { Button } from '@/components';

type AgreementData = {
  id: string;
  status: string;
  commitment_amount: number;
  agreement_date: string;
  investor_signed_name?: string | null;
  investor_signed_at?: string | null;
  issued_at?: string | null;
  signed_copy_received_at?: string | null;
  executed_at?: string | null;
};

type AgreementFiles = {
  draft_url?: string | null;
  signed_url?: string | null;
  executed_url?: string | null;
};

interface Props {
  agreement: AgreementData | null;
  files: AgreementFiles;
  onSigned?: () => Promise<void> | void;
}

export default function InvestorAgreementStatusCard({ agreement, files, onSigned }: Props): React.ReactElement {
  const [typedName, setTypedName] = React.useState('');
  const [ownFunds, setOwnFunds] = React.useState(false);
  const [privateInvestment, setPrivateInvestment] = React.useState(false);
  const [riskDisclosure, setRiskDisclosure] = React.useState(false);
  const [signing, setSigning] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  if (!agreement) {
    return (
      <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
        <h2 className="text-xl font-semibold text-primary mb-2">Agreement Status</h2>
        <p className="text-secondary">Your investor participation agreement has not been issued yet.</p>
      </div>
    );
  }

  const amount = `Rs ${(Number(agreement.commitment_amount) || 0).toLocaleString('en-IN')}`;
  const canSign = agreement.status === 'issued' && !!files.draft_url;

  const handleSign = async () => {
    try {
      setSigning(true);
      setError(null);
      setMessage(null);

      const response = await fetch('/api/investor/agreement/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreement_id: agreement.id,
          typed_name: typedName,
          own_funds: ownFunds,
          private_investment: privateInvestment,
          risk_disclosure: riskDisclosure,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Failed to sign agreement');
      }

      setMessage('Agreement signed successfully.');
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
          <p className="text-secondary">Track your Finverno participation agreement lifecycle.</p>
        </div>
        <span className="px-3 py-1 rounded border text-xs text-accent-amber bg-accent-amber/10 border-accent-amber/20 uppercase">
          {agreement.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid md:grid-cols-5 gap-4 mb-6 text-sm">
        <div className="rounded-lg bg-neutral-medium/30 p-4">
          <div className="text-secondary mb-1">Commitment</div>
          <div className="text-primary font-semibold">{amount}</div>
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
          <div className="text-secondary mb-1">Investor Signed</div>
          <div className="text-primary">{agreement.investor_signed_at ? new Date(agreement.investor_signed_at).toLocaleDateString('en-IN') : '—'}</div>
        </div>
        <div className="rounded-lg bg-neutral-medium/30 p-4">
          <div className="text-secondary mb-1">Executed</div>
          <div className="text-primary">{agreement.executed_at ? new Date(agreement.executed_at).toLocaleDateString('en-IN') : '—'}</div>
        </div>
      </div>

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
            Type your full legal name and confirm the declarations below to complete this agreement on the platform.
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

          <div className="mb-5 space-y-3 text-sm text-secondary">
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={ownFunds} onChange={(event) => setOwnFunds(event.target.checked)} className="mt-1" />
              <span>I confirm I am investing from my own funds.</span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={privateInvestment} onChange={(event) => setPrivateInvestment(event.target.checked)} className="mt-1" />
              <span>I understand this is a private investment opportunity.</span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={riskDisclosure} onChange={(event) => setRiskDisclosure(event.target.checked)} className="mt-1" />
              <span>I have read the risk disclosure.</span>
            </label>
          </div>

          <Button onClick={handleSign} disabled={signing}>
            {signing ? 'Signing...' : 'I Agree And Sign'}
          </Button>
        </div>
      )}

      {(agreement.status === 'investor_signed' || agreement.status === 'executed') && (
        <div className="mt-6 rounded-lg border border-neutral-medium p-5 text-sm">
          <div className="font-medium text-primary">
            {agreement.status === 'executed' ? 'Agreement completed in portal' : 'Investor signature recorded'}
          </div>
          <div className="mt-2 text-secondary">
            Signed by {agreement.investor_signed_name || 'Investor'}
            {agreement.investor_signed_at ? ` on ${new Date(agreement.investor_signed_at).toLocaleString('en-IN')}` : ''}.
          </div>
        </div>
      )}
    </div>
  );
}
