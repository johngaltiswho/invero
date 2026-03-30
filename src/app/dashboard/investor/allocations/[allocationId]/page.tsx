'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useInvestor } from '@/contexts/InvestorContext';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

export default function InvestorAllocationDetailPage(): React.ReactElement {
  const { allocationId } = useParams<{ allocationId: string }>();
  const { investor, loading, error } = useInvestor();

  const sleeve = (investor?.sleeves || []).find((candidate) => candidate.id === allocationId);
  const allocationLabel = sleeve?.modelType === 'fixed_debt' ? 'Fixed Income Allocation' : 'Pool Participation Allocation';

  return (
    <DashboardLayout activeTab="overview">
      <div className="p-6">
        <div className="mb-6">
          <Link href="/dashboard/investor" className="text-sm text-accent-amber hover:underline">
            Back to Portfolio Overview
          </Link>
        </div>

        {loading ? (
          <div className="text-secondary">Loading allocation details...</div>
        ) : error ? (
          <div className="rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">{error}</div>
        ) : !sleeve ? (
          <div className="rounded-lg border border-neutral-medium bg-neutral-dark p-6 text-secondary">
            Allocation not found for this investor profile.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg border border-neutral-medium bg-neutral-dark p-6">
              <div className="mb-2 text-sm uppercase tracking-wide text-accent-amber">
                {String(sleeve.modelType || '').replace(/_/g, ' ')}
              </div>
              <h1 className="text-3xl font-bold text-primary">{allocationLabel}</h1>
              <p className="mt-2 text-secondary">
                Agreement status: {sleeve.latestAgreementStatus || sleeve.agreementStatus || sleeve.status}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-neutral-medium bg-neutral-dark p-5">
                <div className="text-sm text-secondary">Committed</div>
                <div className="mt-2 text-2xl font-semibold text-primary">{formatCurrency(Number(sleeve.commitmentAmount || 0))}</div>
              </div>
              <div className="rounded-lg border border-neutral-medium bg-neutral-dark p-5">
                <div className="text-sm text-secondary">Funded</div>
                <div className="mt-2 text-2xl font-semibold text-primary">{formatCurrency(Number(sleeve.fundedAmount || 0))}</div>
              </div>
              {sleeve.modelType === 'fixed_debt' ? (
                <>
                  <div className="rounded-lg border border-neutral-medium bg-neutral-dark p-5">
                    <div className="text-sm text-secondary">Principal Outstanding</div>
                    <div className="mt-2 text-2xl font-semibold text-primary">{formatCurrency(Number(sleeve.summary?.principalOutstanding || 0))}</div>
                  </div>
                  <div className="rounded-lg border border-neutral-medium bg-neutral-dark p-5">
                    <div className="text-sm text-secondary">Fixed Coupon</div>
                    <div className="mt-2 text-2xl font-semibold text-primary">
                      {((Number(sleeve.summary?.fixedCouponRateAnnual || 0) || 0) * 100).toFixed(2)}%
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-lg border border-neutral-medium bg-neutral-dark p-5">
                    <div className="text-sm text-secondary">Units Held</div>
                    <div className="mt-2 text-2xl font-semibold text-primary">{Number(sleeve.summary?.unitsHeld || 0).toFixed(4)}</div>
                  </div>
                  <div className="rounded-lg border border-neutral-medium bg-neutral-dark p-5">
                    <div className="text-sm text-secondary">Net Value</div>
                    <div className="mt-2 text-2xl font-semibold text-primary">{formatCurrency(Number(sleeve.summary?.netValue || 0))}</div>
                  </div>
                </>
              )}
            </div>

            <div className="rounded-lg border border-neutral-medium bg-neutral-dark p-6">
              <h2 className="mb-4 text-xl font-semibold text-primary">Allocation Metrics</h2>
              {sleeve.modelType === 'fixed_debt' ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded bg-neutral-medium/20 p-4">
                    <div className="text-sm text-secondary">Coupon Accrued</div>
                    <div className="mt-2 text-lg font-medium text-primary">{formatCurrency(Number(sleeve.summary?.couponAccrued || 0))}</div>
                  </div>
                  <div className="rounded bg-neutral-medium/20 p-4">
                    <div className="text-sm text-secondary">Coupon Paid</div>
                    <div className="mt-2 text-lg font-medium text-primary">{formatCurrency(Number(sleeve.summary?.couponPaid || 0))}</div>
                  </div>
                  <div className="rounded bg-neutral-medium/20 p-4">
                    <div className="text-sm text-secondary">Payout Priority Rank</div>
                    <div className="mt-2 text-lg font-medium text-primary">
                      {sleeve.summary?.payoutPriorityRank != null ? String(sleeve.summary.payoutPriorityRank) : 'Not assigned'}
                    </div>
                  </div>
                  <div className="rounded bg-neutral-medium/20 p-4">
                    <div className="text-sm text-secondary">ALM Bucket</div>
                    <div className="mt-2 text-lg font-medium text-primary">{String(sleeve.summary?.almBucket || 'Not assigned')}</div>
                  </div>
                  <div className="rounded bg-neutral-medium/20 p-4 md:col-span-2">
                    <div className="text-sm text-secondary">Liquidity Notes</div>
                    <div className="mt-2 text-primary">{String(sleeve.summary?.liquidityNotes || 'No liquidity notes recorded yet.')}</div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded bg-neutral-medium/20 p-4">
                    <div className="text-sm text-secondary">Entry NAV</div>
                    <div className="mt-2 text-lg font-medium text-primary">{formatCurrency(Number(sleeve.summary?.entryNavPerUnit || 100))}</div>
                  </div>
                  <div className="rounded bg-neutral-medium/20 p-4">
                    <div className="text-sm text-secondary">Ownership Snapshot</div>
                    <div className="mt-2 text-lg font-medium text-primary">{Number(sleeve.summary?.ownershipPercent || 0).toFixed(2)}%</div>
                  </div>
                  <div className="rounded bg-neutral-medium/20 p-4 md:col-span-2">
                    <div className="text-sm text-secondary">Look-through Pool Exposure</div>
                    <div className="mt-2 text-primary">
                      This allocation follows the pool / NAV model. Use the main portfolio view for current pool exposure and projected pooled returns.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
