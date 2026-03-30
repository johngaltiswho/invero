'use client';

import React, { useEffect, useState } from 'react';

type InterestSubmission = {
  id: string;
  preferred_model: 'pool_participation' | 'fixed_debt' | 'open_to_both';
  proposed_amount: number;
  indicative_pool_amount: number;
  indicative_fixed_debt_amount: number;
  liquidity_preference?: 'flexible' | 'income_focused' | 'balanced' | 'higher_return' | null;
  notes?: string | null;
  status: 'new' | 'reviewed' | 'allocation_prepared' | 'converted' | 'cancelled';
  created_at: string;
};

type Props = {
  investor: {
    id: string;
    name: string;
  };
};

const MODEL_LABELS: Record<InterestSubmission['preferred_model'], string> = {
  pool_participation: 'Pool Participation',
  fixed_debt: 'Fixed Income',
  open_to_both: 'Open To Both',
};

export default function InvestorInterestPanel({ investor }: Props): React.ReactElement {
  const [submissions, setSubmissions] = useState<InterestSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    void load();
  }, [investor.id]);

  const load = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/investor-interest?investor_id=${investor.id}`);
      const result = await response.json();
      if (response.ok && result.success) {
        setSubmissions(result.submissions || []);
      }
    } catch (error) {
      console.error('Failed to load investor interest submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const handleDownloadProspectus = async () => {
    try {
      setDownloading(true);
      const response = await fetch(`/api/admin/investor-prospectus?investor_id=${investor.id}`);

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.error || 'Failed to generate prospectus');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${investor.name.replace(/[^a-zA-Z0-9]+/g, '_')}_Finverno_Prospectus.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download investor prospectus:', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mt-6 rounded-lg border border-neutral-medium bg-neutral-dark">
      <div className="border-b border-neutral-medium p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-primary">Investor Interest</h3>
            <p className="mt-1 text-sm text-secondary">
              These are the model preferences {investor.name} has submitted before final allocation is prepared.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadProspectus}
            disabled={downloading}
            className="inline-flex items-center justify-center rounded-lg border border-neutral-medium bg-neutral-darker px-4 py-2 text-sm font-medium text-primary transition hover:bg-neutral-medium/20 disabled:opacity-60"
          >
            {downloading ? 'Generating...' : 'Download Prospectus'}
          </button>
        </div>
      </div>
      <div className="space-y-3 p-6">
        {loading && <div className="text-sm text-secondary">Loading investor interest...</div>}
        {!loading && submissions.length === 0 && (
          <div className="text-sm text-secondary">No investor interest submissions yet.</div>
        )}
        {submissions.map((submission) => (
          <div key={submission.id} className="rounded-lg border border-neutral-medium p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="font-medium text-primary">{MODEL_LABELS[submission.preferred_model]}</div>
                <div className="text-sm text-secondary">{formatCurrency(Number(submission.proposed_amount || 0))}</div>
                {submission.preferred_model === 'open_to_both' && (
                  <div className="mt-1 text-xs text-secondary">
                    Pool: {formatCurrency(Number(submission.indicative_pool_amount || 0))} · Fixed Income: {formatCurrency(Number(submission.indicative_fixed_debt_amount || 0))}
                  </div>
                )}
                {submission.liquidity_preference && (
                  <div className="mt-1 text-xs text-secondary">Liquidity preference: {submission.liquidity_preference.replace(/_/g, ' ')}</div>
                )}
                {submission.notes && <div className="mt-2 text-xs text-secondary">{submission.notes}</div>}
              </div>
              <div className="text-right text-xs text-secondary">
                <div className="uppercase">{submission.status.replace(/_/g, ' ')}</div>
                <div className="mt-1">{new Date(submission.created_at).toLocaleDateString('en-IN')}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
