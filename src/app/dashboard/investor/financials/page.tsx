'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useInvestor } from '@/contexts/InvestorContext';

type InvestorTransaction = {
  id: string;
  transaction_type?: string;
  amount?: number | string;
  status?: string;
  reference_number?: string;
  description?: string;
  created_at?: string;
  projects?: {
    project_name?: string;
  } | null;
};

export default function FinancialManagement(): React.ReactElement {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'transactions' | 'payouts' | 'tax'>('overview');
  const { investor } = useInvestor();
  const portfolioMetrics = investor?.portfolioMetrics || {
    totalInvested: 0,
    totalReturns: 0,
    currentValue: 0,
    roi: 0,
    netRoi: 0,
    activeInvestments: 0,
    completedInvestments: 0,
    totalInvestments: 0,
    capitalInflow: 0,
    capitalReturns: 0,
    netCapitalReturns: 0,
    managementFees: 0,
    performanceFees: 0,
    potentialPerformanceFees: 0,
    grossNavPerUnit: 100,
    netNavPerUnit: 100,
    unitsHeld: 0,
    ownershipPercent: 0,
    deployedPoolShare: 0,
    poolCashShare: 0,
    accruedParticipationIncomeShare: 0,
    preferredReturnAccruedShare: 0
  };
  const poolPosition = investor?.poolPosition || {
    grossValue: 0,
    netValue: 0,
    grossGain: 0,
    netGain: 0,
    entryNavPerUnit: 100
  };
  const poolSummary = investor?.poolSummary || {
    projectedGrossXirr: 0,
    projectedNetXirr: 0,
    realizedXirr: 0
  };

  const transactions = useMemo(() => {
    const allTx = (investor?.transactions || []) as InvestorTransaction[];
    return allTx.map((tx) => {
      const type = String(tx.transaction_type || '').toLowerCase();
      const projectName = tx.projects?.project_name || 'Project';
      const amount = Number(tx.amount) || 0;
      const isOutflow = type === 'deployment' || type === 'withdrawal';
      const rawStatus = tx.status ? String(tx.status) : 'completed';
      const prettyStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
      return {
        id: tx.id,
        date: tx.created_at,
        type: type ? type[0].toUpperCase() + type.slice(1) : 'Transaction',
        projectName,
        amount: isOutflow ? -Math.abs(amount) : Math.abs(amount),
        status: prettyStatus,
        reference: tx.reference_number || '',
        description: tx.description || ''
      };
    });
  }, [investor?.transactions]);

  const completedReturns = useMemo(() => {
    return transactions.filter(
      (tx) => String(tx.type).toLowerCase() === 'return' && String(tx.status).toLowerCase() === 'completed'
    );
  }, [transactions]);

  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount);
    return `${amount < 0 ? '-' : ''}₹${absAmount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTransactionColor = (type: string, amount: number) => {
    if (amount < 0) return 'text-warning'; // Outgoing
    if (type.toLowerCase() === 'return' || type.toLowerCase() === 'inflow') {
      return 'text-success';
    }
    return 'text-primary';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-success/10 text-success';
      case 'Pending': return 'bg-warning/10 text-warning';
      case 'Failed': return 'bg-error/10 text-error';
      default: return 'bg-neutral-medium text-secondary';
    }
  };

  useEffect(() => {
    // No local fetches required for financial summary tabs at the moment.
  }, []);

  return (
    <DashboardLayout activeTab="financials">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Financial Management</h1>
          <p className="text-secondary">
            Comprehensive view of your investments, returns, and tax obligations
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-neutral-medium">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', name: 'Overview' },
                { id: 'transactions', name: 'Transactions' },
                { id: 'payouts', name: 'Payouts' },
                { id: 'tax', name: 'Tax Center' }
              ].map((tab: { id: 'overview' | 'transactions' | 'payouts' | 'tax'; name: string }) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    selectedTab === tab.id
                      ? 'border-accent-amber text-accent-amber'
                      : 'border-transparent text-secondary hover:text-primary'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {selectedTab === 'overview' && (
          <div className="space-y-8">
            {/* Financial Summary Cards */}
            <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6">
              <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                <div className="text-accent-amber text-sm font-mono mb-2">CAPITAL COMMITTED</div>
                <div className="text-2xl font-bold text-primary mb-1">{formatCurrency(portfolioMetrics.totalInvested)}</div>
                <div className="text-xs text-secondary">{(portfolioMetrics.unitsHeld || 0).toFixed(4)} pool units</div>
              </div>
              
              <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                <div className="text-accent-amber text-sm font-mono mb-2">NET POOL VALUE</div>
                <div className="text-2xl font-bold text-primary mb-1">{formatCurrency(poolPosition.netValue)}</div>
                <div className="text-xs text-success">
                  {portfolioMetrics.totalInvested > 0
                    ? `+${((poolPosition.netValue - portfolioMetrics.totalInvested) / portfolioMetrics.totalInvested * 100).toFixed(1)}%`
                    : '—'}
                </div>
              </div>
              
              <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                <div className="text-accent-amber text-sm font-mono mb-2">CURRENT NAV</div>
                <div className="text-2xl font-bold text-success mb-1">₹{(portfolioMetrics.netNavPerUnit || 0).toFixed(4)}</div>
                <div className="text-xs text-secondary">Entry NAV: ₹{poolPosition.entryNavPerUnit.toFixed(4)}</div>
              </div>
              
              <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                <div className="text-accent-amber text-sm font-mono mb-2">PROJECTED NET XIRR</div>
                <div className="text-2xl font-bold text-primary mb-1">{poolSummary.projectedNetXirr.toFixed(1)}%</div>
                <div className="text-xs text-secondary">Realized XIRR: {poolSummary.realizedXirr.toFixed(1)}%</div>
              </div>
            </div>

            <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
              <h3 className="text-lg font-bold text-primary">Pool Fee Waterfall</h3>
              <div className="grid md:grid-cols-2 gap-6 mt-4">
                <div>
                  <div className="text-xs text-secondary mb-1">Accrued 2% Management Fee</div>
                  <div className="text-lg font-semibold text-primary">{formatCurrency(portfolioMetrics.managementFees)}</div>
                  <div className="text-xs text-secondary mt-2">Charged only on capital currently deployed in the pool.</div>
                </div>
                <div>
                  <div className="text-xs text-secondary mb-1">Realized Carry / Potential Carry</div>
                  <div className="text-lg font-semibold text-primary">
                    {formatCurrency(portfolioMetrics.performanceFees)} / {formatCurrency(portfolioMetrics.potentialPerformanceFees || 0)}
                  </div>
                  <div className="text-xs text-secondary mt-2">Carry is deducted only when realized profits exceed the 12% preferred return hurdle.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'payouts' && (
          <div className="space-y-8">
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
              <h2 className="text-xl font-semibold text-primary mb-2">Upcoming Payouts</h2>
              <p className="text-secondary text-sm mb-6">
                Completed capital returns are listed here.
              </p>
              <div className="space-y-4">
                {completedReturns.length === 0 && (
                  <div className="text-secondary text-sm">No completed returns yet.</div>
                )}
                {completedReturns.map((payout) => (
                  <div key={payout.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-neutral-medium rounded-lg p-4">
                    <div>
                      <div className="text-primary font-medium">{payout.projectName}</div>
                      <div className="text-xs text-secondary">{payout.description || 'Capital return'}</div>
                      <div className="text-xs text-secondary mt-1">{payout.date ? formatDate(payout.date) : 'Date not set'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-primary font-semibold">{formatCurrency(payout.amount)}</div>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${getStatusColor(payout.status)}`}>
                        {payout.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'transactions' && (
          <div className="space-y-6">
            {/* Transactions Table */}
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="p-6 border-b border-neutral-medium">
                <h3 className="text-lg font-bold text-primary">Transaction History</h3>
                <p className="text-sm text-secondary">Complete record of all financial transactions</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-medium">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-primary">Date</th>
                      <th className="text-left p-4 text-sm font-medium text-primary">Type</th>
                      <th className="text-left p-4 text-sm font-medium text-primary">Project</th>
                      <th className="text-right p-4 text-sm font-medium text-primary">Amount</th>
                      <th className="text-center p-4 text-sm font-medium text-primary">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-primary">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 && (
                      <tr>
                        <td className="p-4 text-sm text-secondary" colSpan={6}>
                          No transactions available yet.
                        </td>
                      </tr>
                    )}
                    {transactions.map((txn) => (
                      <tr key={txn.id} className="border-b border-neutral-medium">
                        <td className="p-4 text-sm text-primary">{formatDate(txn.date)}</td>
                        <td className="p-4">
                          <div className="text-sm font-medium text-primary">{txn.type}</div>
                          <div className="text-xs text-secondary">{txn.description}</div>
                        </td>
                        <td className="p-4 text-sm text-secondary">{txn.projectName}</td>
                        <td className={`p-4 text-sm text-right font-medium ${getTransactionColor(txn.type, txn.amount)}`}>
                          {formatCurrency(txn.amount)}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(txn.status)}`}>
                            {txn.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-secondary font-mono">{txn.reference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'tax' && (
          <div className="space-y-8">
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
              <h2 className="text-xl font-semibold text-primary mb-2">Tax Center</h2>
              <p className="text-secondary text-sm">
                Tax statements will be available once payout reports are finalized.
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
