'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components';

type Allocation = {
  modelType: 'fixed_debt' | 'pool_participation';
  amount: number;
};

type AllocationIntent = {
  id: string;
  status:
    | 'draft'
    | 'agreements_pending'
    | 'ready_for_funding'
    | 'funding_submitted'
    | 'completed'
    | 'cancelled'
    | 'superseded';
  total_amount: number;
  allocation_payload: Allocation[];
  agreements_ready_at?: string | null;
  funding_submitted_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  notes?: string | null;
};

type Investor = {
  id: string;
  name: string;
  email: string;
};

type Props = {
  investor: Investor;
};

const STATUS_LABELS: Record<AllocationIntent['status'], string> = {
  draft: 'Draft',
  agreements_pending: 'Awaiting Signatures',
  ready_for_funding: 'Ready To Fund',
  funding_submitted: 'Funding Submitted',
  completed: 'Active',
  cancelled: 'Cancelled',
  superseded: 'Superseded',
};

export default function InvestorAllocationPanel({ investor }: Props): React.ReactElement {
  const [intents, setIntents] = useState<AllocationIntent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    amount: '',
    poolParticipationAmount: '',
    fixedDebtAmount: '',
    notes: '',
  });
  const [allocationTouched, setAllocationTouched] = useState(false);

  const currentIntent = useMemo(
    () => intents.find((intent) => !['completed', 'cancelled', 'superseded'].includes(intent.status)) || intents[0] || null,
    [intents]
  );

  useEffect(() => {
    void fetchIntents();
  }, [investor.id]);

  useEffect(() => {
    if (allocationTouched) return;
    setForm((prev) => ({
      ...prev,
      poolParticipationAmount: prev.amount,
      fixedDebtAmount: '',
    }));
  }, [form.amount, allocationTouched]);

  const fetchIntents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/lender-allocation-intents?investor_id=${investor.id}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to load allocation intents');
      }
      setIntents(result.intents || []);
    } catch (fetchError) {
      console.error('Failed to load investor allocation intents:', fetchError);
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load allocation intents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIntent = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Enter a valid proposed amount');
      }

      const poolParticipationAmount = Number(form.poolParticipationAmount || 0);
      const fixedDebtAmount = Number(form.fixedDebtAmount || 0);
      if (poolParticipationAmount < 0 || fixedDebtAmount < 0) {
        throw new Error('Allocation amounts cannot be negative');
      }
      if (Math.abs(poolParticipationAmount + fixedDebtAmount - amount) > 0.01) {
        throw new Error('Pool participation and fixed debt amounts must add up to the total amount');
      }

      const response = await fetch('/api/admin/lender-allocation-intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investor_id: investor.id,
          total_amount: amount,
          notes: form.notes,
          allocations: [
            poolParticipationAmount > 0 ? { modelType: 'pool_participation', amount: poolParticipationAmount } : null,
            fixedDebtAmount > 0 ? { modelType: 'fixed_debt', amount: fixedDebtAmount } : null,
          ].filter(Boolean),
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to create allocation');
      }

      setMessage(
        result.ready_for_funding
          ? 'Allocation prepared. Executed agreements already exist, so the investor can fund immediately.'
          : 'Allocation prepared. Fresh agreements have been generated and the investor must sign before funding.'
      );
      setAllocationTouched(false);
      setForm({
        amount: '',
        poolParticipationAmount: '',
        fixedDebtAmount: '',
        notes: '',
      });
      await fetchIntents();
    } catch (saveError) {
      console.error('Failed to create investor allocation intent:', saveError);
      setError(saveError instanceof Error ? saveError.message : 'Failed to create allocation');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateString?: string | null) =>
    dateString
      ? new Date(dateString).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '—';

  const renderAllocationSummary = (allocationPayload: Allocation[]) =>
    allocationPayload
      .map((allocation) =>
        `${allocation.modelType === 'fixed_debt' ? 'Fixed Debt' : 'Pool Participation'}: ${formatCurrency(Number(allocation.amount || 0))}`
      )
      .join(' · ');

  const getStatusColor = (status: AllocationIntent['status']) => {
    switch (status) {
      case 'ready_for_funding':
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'agreements_pending':
      case 'funding_submitted':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'cancelled':
      case 'superseded':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-neutral-medium text-secondary border-neutral-medium';
    }
  };

  return (
    <div className="mt-6 rounded-lg border border-neutral-medium bg-neutral-dark">
      <div className="border-b border-neutral-medium p-6">
        <h3 className="text-xl font-semibold text-primary">Proposed Allocation</h3>
        <p className="mt-1 text-sm text-secondary">
          Keep the discussion offline, set the split here, then let the system generate the required agreements for {investor.name}.
        </p>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-lg border border-neutral-medium bg-neutral-darker/40 p-4">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">Create Or Refresh Proposal</h4>
          <div className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-wide text-secondary">Total Amount (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => {
                  const nextAmount = e.target.value;
                  setForm((prev) => {
                    if (!allocationTouched) {
                      return {
                        ...prev,
                        amount: nextAmount,
                        poolParticipationAmount: nextAmount,
                        fixedDebtAmount: '',
                      };
                    }

                    return {
                      ...prev,
                      amount: nextAmount,
                    };
                  });
                }}
                className="mt-2 w-full rounded-lg border border-neutral-medium bg-neutral-darker px-3 py-2 text-sm text-primary"
                placeholder="Enter committed amount"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-wide text-secondary">Pool Participation (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.poolParticipationAmount}
                  onChange={(e) => {
                    setAllocationTouched(true);
                    setForm((prev) => ({ ...prev, poolParticipationAmount: e.target.value }));
                  }}
                  className="mt-2 w-full rounded-lg border border-neutral-medium bg-neutral-darker px-3 py-2 text-sm text-primary"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-secondary">Fixed Debt (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.fixedDebtAmount}
                  onChange={(e) => {
                    setAllocationTouched(true);
                    setForm((prev) => ({ ...prev, fixedDebtAmount: e.target.value }));
                  }}
                  className="mt-2 w-full rounded-lg border border-neutral-medium bg-neutral-darker px-3 py-2 text-sm text-primary"
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-secondary">Notes (Optional)</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="mt-2 w-full rounded-lg border border-neutral-medium bg-neutral-darker px-3 py-2 text-sm text-primary"
                placeholder="Internal notes or context shared with the investor"
              />
            </div>
            <p className="text-xs text-secondary">
              Creating a new proposal supersedes open proposals and regenerates any non-executed agreement drafts for the relevant sleeves.
            </p>
            <Button size="sm" disabled={saving} onClick={handleCreateIntent}>
              {saving ? 'Saving...' : 'Create Proposal'}
            </Button>
            {message && <p className="text-xs text-secondary">{message}</p>}
            {error && <p className="text-xs text-error">{error}</p>}
          </div>
        </div>

        <div className="rounded-lg border border-neutral-medium bg-neutral-darker/40 p-4">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">Current Investor Step</h4>
          {currentIntent ? (
            <div className="space-y-3 text-sm text-secondary">
              <div className="text-primary font-medium">{formatCurrency(Number(currentIntent.total_amount || 0))}</div>
              <div>{renderAllocationSummary(currentIntent.allocation_payload || [])}</div>
              <span className={`inline-flex rounded border px-2 py-1 text-xs ${getStatusColor(currentIntent.status)}`}>
                {STATUS_LABELS[currentIntent.status]}
              </span>
              <div>
                {currentIntent.status === 'agreements_pending' && 'Investor should review and sign the current agreement set.'}
                {currentIntent.status === 'ready_for_funding' && 'Investor can now see funding instructions and submit transfer proof.'}
                {currentIntent.status === 'funding_submitted' && 'Funding proof has been submitted and is waiting for admin approval.'}
                {currentIntent.status === 'completed' && 'Funding has been approved and capital is live.'}
                {currentIntent.status === 'draft' && 'Proposal exists but still needs current agreements to be prepared.'}
              </div>
            </div>
          ) : (
            <div className="text-sm text-secondary">No proposal has been created yet for this investor.</div>
          )}
        </div>
      </div>

      <div className="border-t border-neutral-medium p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-primary">Proposal History</h4>
            <p className="text-sm text-secondary">Only the current proposal matters for the investor. Older entries stay as internal history.</p>
          </div>
          <div className="text-sm text-secondary">{loading ? 'Loading...' : `${intents.length} proposals`}</div>
        </div>
        <div className="space-y-3">
          {!loading && intents.length === 0 && <div className="text-sm text-secondary">No proposals yet.</div>}
          {intents.map((intent) => (
            <div key={intent.id} className="rounded-lg border border-neutral-medium p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="font-medium text-primary">{formatCurrency(Number(intent.total_amount || 0))}</div>
                  <div className="text-xs text-secondary">{renderAllocationSummary(intent.allocation_payload || [])}</div>
                  <div className="mt-1 text-xs text-secondary">
                    Created {formatDate(intent.created_at)}
                    {intent.agreements_ready_at ? ` · Agreements ready ${formatDate(intent.agreements_ready_at)}` : ''}
                    {intent.completed_at ? ` · Completed ${formatDate(intent.completed_at)}` : ''}
                  </div>
                  {intent.notes && <div className="mt-2 text-xs text-secondary">{intent.notes}</div>}
                </div>
                <span className={`inline-flex rounded border px-2 py-1 text-xs ${getStatusColor(intent.status)}`}>
                  {STATUS_LABELS[intent.status]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
