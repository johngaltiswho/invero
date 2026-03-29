'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useInvestor } from '@/contexts/InvestorContext';

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

const MODEL_OPTIONS = [
  {
    id: 'pool_participation',
    title: 'Pool Participation',
    subtitle: 'Variable-return pooled participation',
    points: [
      'Participates in the pooled working-capital strategy rather than one specific receivable.',
      'Current structure includes 12% hurdle, 2% management fee on deployed capital only, and 20% carry above hurdle.',
      'Designed for investors comfortable with portfolio-style performance and variable cashflow timing.',
    ],
    idealFor: 'Investors seeking higher upside, portfolio diversification, and NAV-based reporting.',
  },
  {
    id: 'fixed_debt',
    title: 'Fixed Income',
    subtitle: 'Private fixed-income sleeve',
    points: [
      'Annualized coupon is set on funded and outstanding principal.',
      'Repayment timing depends on receivable realization, ALM, and payout sequencing rather than a hard maturity date.',
      'Designed for investors who want clearer fixed-income economics with separate sleeve reporting.',
    ],
    idealFor: 'Investors prioritizing income visibility over pool-style variable return participation.',
  },
] as const;

export default function InvestorOptionsPage(): React.ReactElement {
  const { investor } = useInvestor();
  const [submissions, setSubmissions] = useState<InterestSubmission[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    preferredModel: 'open_to_both',
    proposedAmount: '',
    indicativePoolAmount: '',
    indicativeFixedDebtAmount: '',
    liquidityPreference: 'balanced',
    notes: '',
  });

  const latestSubmission = submissions[0] || null;

  useEffect(() => {
    void loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const response = await fetch('/api/investor/interest');
      const result = await response.json();
      if (response.ok && result.success) {
        setSubmissions(result.submissions || []);
      }
    } catch (error) {
      console.error('Failed to load investor interest submissions:', error);
    }
  };

  const suggestedSplitText = useMemo(() => {
    if (form.preferredModel !== 'open_to_both') return null;
    const pool = Number(form.indicativePoolAmount || 0);
    const fixed = Number(form.indicativeFixedDebtAmount || 0);
    if (pool <= 0 && fixed <= 0) return 'You can leave the split blank if you want Finverno to recommend one.';
    return `Indicative split: Pool ${formatCurrency(pool)} · Fixed Income ${formatCurrency(fixed)}`;
  }, [form.preferredModel, form.indicativePoolAmount, form.indicativeFixedDebtAmount]);

  const submitInterest = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/investor/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferred_model: form.preferredModel,
          proposed_amount: Number(form.proposedAmount),
          indicative_pool_amount: Number(form.indicativePoolAmount || 0),
          indicative_fixed_debt_amount: Number(form.indicativeFixedDebtAmount || 0),
          liquidity_preference: form.liquidityPreference,
          notes: form.notes,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to submit investment preference');
      }

      setMessage('Your preference has been shared with Finverno. We will review it and prepare the proposed allocation and agreement set.');
      setForm({
        preferredModel: 'open_to_both',
        proposedAmount: '',
        indicativePoolAmount: '',
        indicativeFixedDebtAmount: '',
        liquidityPreference: 'balanced',
        notes: '',
      });
      await loadSubmissions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to submit investment preference');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <DashboardLayout activeTab="opportunities">
      <div className="p-4 sm:p-6">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">Investment Options</h1>
          <p className="text-secondary">
            Review the two Finverno models, share your preference, and let us prepare the final allocation and agreement flow with you.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {MODEL_OPTIONS.map((model) => (
            <section key={model.id} className="rounded-lg border border-neutral-medium bg-neutral-dark p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-primary">{model.title}</h2>
                <p className="mt-1 text-sm text-secondary">{model.subtitle}</p>
              </div>
              <div className="space-y-3 text-sm text-secondary">
                {model.points.map((point) => (
                  <p key={point}>{point}</p>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-neutral-medium/20 p-4 text-sm">
                <div className="text-primary font-medium mb-1">Best suited for</div>
                <div className="text-secondary">{model.idealFor}</div>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <section className="rounded-lg border border-neutral-medium bg-neutral-dark p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-primary">Share Your Preference</h2>
              <p className="mt-1 text-sm text-secondary">
                Tell us the amount and indicative model preference. Finverno will review it offline, prepare the proposed split, and then issue the relevant agreements.
              </p>
            </div>

            <form className="space-y-4" onSubmit={submitInterest}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-primary">Preferred Model</label>
                  <select
                    value={form.preferredModel}
                    onChange={(event) => setForm((prev) => ({ ...prev, preferredModel: event.target.value }))}
                    className="w-full rounded-lg border border-neutral-medium bg-neutral-darker px-3 py-2 text-primary"
                  >
                    <option value="pool_participation">Pool Participation</option>
                    <option value="fixed_debt">Fixed Income</option>
                    <option value="open_to_both">Open To Both</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-primary">Indicative Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.proposedAmount}
                    onChange={(event) => setForm((prev) => ({ ...prev, proposedAmount: event.target.value }))}
                    className="w-full rounded-lg border border-neutral-medium bg-neutral-darker px-3 py-2 text-primary"
                    placeholder="Enter amount"
                  />
                </div>
              </div>

              {form.preferredModel === 'open_to_both' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-primary">Indicative Pool Split</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.indicativePoolAmount}
                      onChange={(event) => setForm((prev) => ({ ...prev, indicativePoolAmount: event.target.value }))}
                      className="w-full rounded-lg border border-neutral-medium bg-neutral-darker px-3 py-2 text-primary"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-primary">Indicative Fixed Income Split</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.indicativeFixedDebtAmount}
                      onChange={(event) => setForm((prev) => ({ ...prev, indicativeFixedDebtAmount: event.target.value }))}
                      className="w-full rounded-lg border border-neutral-medium bg-neutral-darker px-3 py-2 text-primary"
                      placeholder="0"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-primary">Liquidity Preference</label>
                <select
                  value={form.liquidityPreference}
                  onChange={(event) => setForm((prev) => ({ ...prev, liquidityPreference: event.target.value }))}
                  className="w-full rounded-lg border border-neutral-medium bg-neutral-darker px-3 py-2 text-primary"
                >
                  <option value="flexible">Flexible</option>
                  <option value="income_focused">Income Focused</option>
                  <option value="balanced">Balanced</option>
                  <option value="higher_return">Higher Return Oriented</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-primary">Notes</label>
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  className="w-full rounded-lg border border-neutral-medium bg-neutral-darker px-3 py-2 text-primary"
                  placeholder="Anything else you want us to consider before we propose the final split"
                />
              </div>

              {suggestedSplitText && <div className="text-xs text-secondary">{suggestedSplitText}</div>}
              {message && <div className="rounded-lg bg-neutral-medium/20 p-3 text-sm text-secondary">{message}</div>}

              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-accent-amber px-5 py-3 font-semibold text-neutral-darker transition-colors hover:bg-accent-amber/90 disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Share Preference'}
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-neutral-medium bg-neutral-dark p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-primary">What Happens Next</h2>
              <p className="mt-1 text-sm text-secondary">
                Keep the first discussion simple. We’ll do the structuring in the background.
              </p>
            </div>
            <div className="space-y-4 text-sm text-secondary">
              <div>
                <div className="text-primary font-medium">1. Preference Review</div>
                <div>Finverno reviews your amount, model preference, and any indicative split you shared.</div>
              </div>
              <div>
                <div className="text-primary font-medium">2. Proposed Allocation</div>
                <div>We discuss and finalize the proposed allocation offline, then configure the sleeve allocation in your account.</div>
              </div>
              <div>
                <div className="text-primary font-medium">3. Agreements</div>
                <div>The relevant agreement set is issued for review and signature.</div>
              </div>
              <div>
                <div className="text-primary font-medium">4. Funding</div>
                <div>Once executed, the dashboard unlocks funding instructions and transfer confirmation.</div>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-neutral-medium bg-neutral-darker/40 p-4">
              <div className="text-sm font-medium text-primary">Latest Preference</div>
              {latestSubmission ? (
                <div className="mt-2 space-y-2 text-sm text-secondary">
                  <div>
                    {latestSubmission.preferred_model === 'pool_participation'
                      ? 'Pool Participation'
                      : latestSubmission.preferred_model === 'fixed_debt'
                      ? 'Fixed Income'
                      : 'Open To Both'}
                  </div>
                  <div>{formatCurrency(Number(latestSubmission.proposed_amount || 0))}</div>
                  {latestSubmission.preferred_model === 'open_to_both' && (
                    <div className="text-xs">
                      Pool: {formatCurrency(Number(latestSubmission.indicative_pool_amount || 0))} · Fixed Income: {formatCurrency(Number(latestSubmission.indicative_fixed_debt_amount || 0))}
                    </div>
                  )}
                  <div className="text-xs uppercase">{latestSubmission.status.replace(/_/g, ' ')}</div>
                </div>
              ) : (
                <div className="mt-2 text-sm text-secondary">No preference submitted yet.</div>
              )}
            </div>

            <div className="mt-6 rounded-lg border border-neutral-medium bg-neutral-darker/40 p-4 text-sm text-secondary">
              Logged in as <span className="text-primary font-medium">{(investor as any)?.investorName || (investor as any)?.name || 'Investor'}</span>
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
