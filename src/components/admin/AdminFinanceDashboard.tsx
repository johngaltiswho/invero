'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components';
import { getPurchaseRequestDisplayState } from '@/lib/purchase-request-state';

type FinanceSummary = {
  total_requests: number;
  total_requested_value: number;
  total_funded: number;
  total_returns: number;
  total_platform_fee?: number;
  total_participation_fee?: number;
  total_outstanding: number;
  funding_required: number; // Only open requests that need funding
  total_projects: number;
  total_contractors: number;
};

type ProjectFinanceRow = {
  project_id: string;
  project_name: string | null;
  contractor_name: string | null;
  total_requested: number;
  total_funded: number;
  total_returns: number;
  total_platform_fee?: number;
  total_participation_fee?: number;
  total_outstanding: number;
  request_count: number;
};

type InvestorFinanceRow = {
  investor_id: string;
  investor_name: string | null;
  investor_email: string | null;
  investor_type: string | null;
  total_inflow: number;
  total_deployed: number;
  total_returns: number;
  xirr: number;
  net_xirr: number;
  disbursements: Array<{
    purchase_request_id: string;
    project_id: string | null;
    project_name: string | null;
    contractor_name: string | null;
    amount: number;
    last_deployed_at: string | null;
  }>;
};

type RequestFinanceRow = {
  purchase_request_id: string;
  project_id: string | null;
  project_name: string | null;
  contractor_name: string | null;
  vendor_name: string | null;
  status: string | null;
  delivery_status?: string | null;
  requested_total: number;
  funded_total: number;
  returned_total: number;
  outstanding_principal: number;
  outstanding_fee: number;
  outstanding_total: number;
  remaining_due: number;
  platform_fee: number;
  participation_fee: number;
  days_outstanding: number;
};

type FundingLedgerRow = {
  purchase_request_id: string;
  project_id: string | null;
  project_name: string | null;
  contractor_name: string | null;
  vendor_name: string | null;
  event_type: 'deployment' | 'return';
  event_date: string | null;
  amount: number;
  running_principal_outstanding: number;
  running_fee_outstanding: number;
  running_total_outstanding: number;
};

type PoolSummary = {
  valuation_date: string;
  total_committed_capital: number;
  total_pool_units: number;
  gross_nav_per_unit: number;
  net_nav_per_unit: number;
  pool_cash: number;
  deployed_principal: number;
  accrued_participation_income: number;
  realized_participation_income: number;
  preferred_return_accrued: number;
  management_fee_accrued: number;
  realized_carry_accrued: number;
  potential_carry: number;
  gross_pool_value: number;
  net_pool_value: number;
  realized_xirr: number;
  projected_gross_xirr: number;
  projected_net_xirr: number;
};

type InvestorPoolPosition = {
  investor_id: string;
  investor_name: string | null;
  investor_email: string | null;
  investor_type: string | null;
  contributed_capital: number;
  units_held: number;
  ownership_percent: number;
  entry_nav_per_unit: number;
  gross_value: number;
  net_value: number;
  gross_gain: number;
  net_gain: number;
};

const toFiniteNumber = (value: unknown): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(toFiniteNumber(amount));

const AdminFinanceDashboard: React.FC = () => {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [poolSummary, setPoolSummary] = useState<PoolSummary | null>(null);
  const [projects, setProjects] = useState<ProjectFinanceRow[]>([]);
  const [investors, setInvestors] = useState<InvestorFinanceRow[]>([]);
  const [investorPositions, setInvestorPositions] = useState<InvestorPoolPosition[]>([]);
  const [requests, setRequests] = useState<RequestFinanceRow[]>([]);
  const [fundingLedger, setFundingLedger] = useState<FundingLedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/finance/overview');
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load finance overview');
        }
        setSummary(data.summary);
        setPoolSummary(data.pool_summary || null);
        setProjects(data.projects || []);
        setInvestors(data.investors || []);
        setInvestorPositions(data.investor_positions || []);
        setRequests(data.requests || []);
        setFundingLedger(data.funding_ledger || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load finance overview');
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-orange"></div>
        <span className="ml-3 text-secondary">Loading finance dashboard...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Finance Dashboard</h1>
          <p className="text-secondary">
            Track material funding, repayments, and outstanding exposure across all projects.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/capital">
            <Button variant="outline">Go to Capital Management</Button>
          </Link>
          <Link href="/admin/verification">
            <Button variant="outline">Review Purchase Requests</Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg mb-6">
          <div className="flex items-center">
            <span className="text-lg mr-2">⚠️</span>
            {error}
          </div>
        </div>
      )}

      {summary && (
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">TOTAL MATERIALS FUNDED</div>
            <div className="text-2xl font-bold text-primary mb-1">
              {formatCurrency(summary.total_funded)}
            </div>
            <div className="text-xs text-secondary">{summary.total_requests} purchase requests</div>
          </div>
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">TOTAL FUNDED RETURNS</div>
            <div className="text-2xl font-bold text-success mb-1">
              {formatCurrency(summary.total_returns)}
            </div>
            <div className="text-xs text-secondary">Capital returned by contractors</div>
          </div>
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">AMOUNT OWED TO FINVERNO</div>
            <div className="text-2xl font-bold text-accent-blue mb-1">
              {formatCurrency(summary.total_outstanding)}
            </div>
            <div className="text-xs text-secondary">Funded + fees - returns</div>
          </div>
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">FUNDING REQUIRED</div>
            <div className="text-2xl font-bold text-accent-amber mb-1">
              {formatCurrency(summary.funding_required || 0)}
            </div>
            <div className="text-xs text-secondary">
              Open requests needing funding
            </div>
          </div>
        </div>
      )}

      {poolSummary && (
        <div className="mb-8">
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium overflow-hidden">
            <div className="p-6 border-b border-neutral-medium flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-primary">Pool Overview</h2>
                <p className="text-sm text-secondary">Fund-style view of the capital pool. PR deployments remain operational underneath this layer.</p>
              </div>
              <div className="text-sm text-secondary">
                Valued {new Date(poolSummary.valuation_date).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 p-6">
              <div>
                <div className="text-xs text-secondary">Gross Pool Value</div>
                <div className="text-2xl font-bold text-primary">{formatCurrency(poolSummary.gross_pool_value)}</div>
                <div className="text-xs text-secondary mt-1">Net pool value: {formatCurrency(poolSummary.net_pool_value)}</div>
              </div>
              <div>
                <div className="text-xs text-secondary">Gross / Net NAV</div>
                <div className="text-2xl font-bold text-primary">₹{poolSummary.gross_nav_per_unit.toFixed(4)}</div>
                <div className="text-xs text-secondary mt-1">Net NAV: ₹{poolSummary.net_nav_per_unit.toFixed(4)}</div>
              </div>
              <div>
                <div className="text-xs text-secondary">Projected Gross / Net XIRR</div>
                <div className="text-2xl font-bold text-accent-amber">
                  {poolSummary.projected_gross_xirr.toFixed(1)}%
                </div>
                <div className="text-xs text-secondary mt-1">Net XIRR: {poolSummary.projected_net_xirr.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-xs text-secondary">Realized XIRR / Units</div>
                <div className="text-2xl font-bold text-primary">{poolSummary.realized_xirr.toFixed(1)}%</div>
                <div className="text-xs text-secondary mt-1">{poolSummary.total_pool_units.toFixed(4)} units outstanding</div>
              </div>
              <div>
                <div className="text-xs text-secondary">Pool Cash</div>
                <div className="text-lg font-semibold text-success">{formatCurrency(poolSummary.pool_cash)}</div>
              </div>
              <div>
                <div className="text-xs text-secondary">Deployed Principal</div>
                <div className="text-lg font-semibold text-accent-blue">{formatCurrency(poolSummary.deployed_principal)}</div>
              </div>
              <div>
                <div className="text-xs text-secondary">Accrued Participation Income</div>
                <div className="text-lg font-semibold text-accent-amber">{formatCurrency(poolSummary.accrued_participation_income)}</div>
                <div className="text-xs text-secondary mt-1">Realized: {formatCurrency(poolSummary.realized_participation_income)}</div>
              </div>
              <div>
                <div className="text-xs text-secondary">Preferred Return Accrued</div>
                <div className="text-lg font-semibold text-primary">{formatCurrency(poolSummary.preferred_return_accrued)}</div>
              </div>
              <div>
                <div className="text-xs text-secondary">2% Management Fee Accrued</div>
                <div className="text-lg font-semibold text-primary">{formatCurrency(poolSummary.management_fee_accrued)}</div>
              </div>
              <div>
                <div className="text-xs text-secondary">Realized Carry</div>
                <div className="text-lg font-semibold text-primary">{formatCurrency(poolSummary.realized_carry_accrued)}</div>
              </div>
              <div>
                <div className="text-xs text-secondary">Potential Carry</div>
                <div className="text-lg font-semibold text-primary">{formatCurrency(poolSummary.potential_carry)}</div>
                <div className="text-xs text-secondary mt-1">For transparency only. Not crystallized.</div>
              </div>
              <div>
                <div className="text-xs text-secondary">Committed Capital</div>
                <div className="text-lg font-semibold text-primary">{formatCurrency(poolSummary.total_committed_capital)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-neutral-dark rounded-lg border border-neutral-medium overflow-hidden">
        <div className="p-6 border-b border-neutral-medium flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primary">Project Funding Overview</h2>
            <p className="text-sm text-secondary">Aggregated purchase request funding by project</p>
          </div>
          <div className="text-sm text-secondary">
            {projects.length} projects
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-neutral-darker text-secondary text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-4">Project</th>
                <th className="px-6 py-4">Contractor</th>
                <th className="px-6 py-4">Requests</th>
                <th className="px-6 py-4">Funding Required</th>
                <th className="px-6 py-4">Funded</th>
                <th className="px-6 py-4">Returns</th>
                <th className="px-6 py-4">Platform Fee</th>
                <th className="px-6 py-4">Participation Fee</th>
                <th className="px-6 py-4">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-medium">
              {projects.map((project) => (
                <tr key={project.project_id} className="hover:bg-neutral-medium/20">
                  <td className="px-6 py-4 text-primary font-medium">
                    {project.project_name || 'Unnamed Project'}
                  </td>
                  <td className="px-6 py-4 text-secondary">
                    {project.contractor_name || '—'}
                  </td>
                  <td className="px-6 py-4 text-secondary">
                    {project.request_count}
                  </td>
                  <td className="px-6 py-4 text-primary">
                    {formatCurrency(project.total_requested)}
                  </td>
                  <td className="px-6 py-4 text-success">
                    {formatCurrency(project.total_funded)}
                  </td>
                  <td className="px-6 py-4 text-accent-amber">
                    {formatCurrency(project.total_returns)}
                  </td>
                  <td className="px-6 py-4 text-accent-amber">
                    {formatCurrency(project.total_platform_fee || 0)}
                  </td>
                  <td className="px-6 py-4 text-accent-blue">
                    {formatCurrency(project.total_participation_fee || 0)}
                  </td>
                  <td className="px-6 py-4 text-accent-blue font-medium">
                    {formatCurrency(project.total_outstanding)}
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td className="px-6 py-6 text-center text-secondary" colSpan={9}>
                    No purchase request funding data available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 bg-neutral-dark rounded-lg border border-neutral-medium overflow-hidden">
        <div className="p-6 border-b border-neutral-medium flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primary">Purchase Request Reconciliation</h2>
            <p className="text-sm text-secondary">Outstanding principal, accrued fee, and returns by purchase request.</p>
          </div>
          <div className="text-sm text-secondary">
            {requests.length} requests
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-neutral-darker text-secondary text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-4">Purchase Request</th>
                <th className="px-6 py-4">Contractor / Vendor</th>
                <th className="px-6 py-4">Material</th>
                <th className="px-6 py-4">Platform Fee</th>
                <th className="px-6 py-4">Project Participation Fee</th>
                <th className="px-6 py-4">Returned</th>
                <th className="px-6 py-4">Principal Outstanding</th>
                <th className="px-6 py-4">Accrued Fee Outstanding</th>
                <th className="px-6 py-4">Total Repayable</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-medium">
              {requests.map((request) => {
                const fundedTotal = toFiniteNumber(request.funded_total);
                const platformFee = toFiniteNumber(request.platform_fee);
                const participationFee = toFiniteNumber(request.participation_fee);
                const returnedTotal = toFiniteNumber(request.returned_total);
                const outstandingPrincipal = toFiniteNumber(request.outstanding_principal);
                const outstandingFee = toFiniteNumber(request.outstanding_fee);
                const remainingDue = Number(request.remaining_due);
                const totalRepayable =
                  Number.isFinite(remainingDue)
                    ? remainingDue
                    : outstandingPrincipal + outstandingFee + platformFee;
                const displayState = getPurchaseRequestDisplayState({
                  status: request.status,
                  delivery_status: request.delivery_status,
                  funded_amount: fundedTotal,
                  remaining_due: totalRepayable,
                });

                return (
                  <tr key={request.purchase_request_id} className="hover:bg-neutral-medium/20">
                    <td className="px-6 py-4 text-primary font-medium">
                      <div>PR-{request.purchase_request_id.slice(0, 8).toUpperCase()}</div>
                      <div className="text-xs text-secondary/70">{request.days_outstanding} days outstanding</div>
                    </td>
                    <td className="px-6 py-4 text-secondary">
                      <div>{request.contractor_name || '—'}</div>
                      <div className="text-xs text-secondary/70">Vendor: {request.vendor_name || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-success">{formatCurrency(fundedTotal)}</td>
                    <td className="px-6 py-4 text-accent-amber">{formatCurrency(platformFee)}</td>
                    <td className="px-6 py-4 text-accent-blue">{formatCurrency(participationFee)}</td>
                    <td className="px-6 py-4 text-accent-amber">{formatCurrency(returnedTotal)}</td>
                    <td className="px-6 py-4 text-primary">{formatCurrency(outstandingPrincipal)}</td>
                    <td className="px-6 py-4 text-accent-blue">{formatCurrency(outstandingFee)}</td>
                    <td className="px-6 py-4 text-accent-blue font-medium">{formatCurrency(totalRepayable)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded border ${displayState.classes}`}>{displayState.label}</span>
                    </td>
                  </tr>
                );
              })}
              {requests.length === 0 && (
                <tr>
                  <td className="px-6 py-6 text-center text-secondary" colSpan={10}>
                    No purchase request reconciliation data available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 bg-neutral-dark rounded-lg border border-neutral-medium overflow-hidden">
        <div className="p-6 border-b border-neutral-medium flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primary">Funding Ledger</h2>
            <p className="text-sm text-secondary">Running deployment and repayment entries with outstanding balance after each event.</p>
          </div>
          <div className="text-sm text-secondary">
            {fundingLedger.length} ledger entries
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-neutral-darker text-secondary text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Purchase Request</th>
                <th className="px-6 py-4">Project</th>
                <th className="px-6 py-4">Contractor / Vendor</th>
                <th className="px-6 py-4">Event</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Principal Outstanding</th>
                <th className="px-6 py-4">Fee Outstanding</th>
                <th className="px-6 py-4">Total Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-medium">
              {fundingLedger.map((entry, index) => (
                <tr key={`${entry.purchase_request_id}-${entry.event_type}-${entry.event_date}-${index}`} className="hover:bg-neutral-medium/20">
                  <td className="px-6 py-4 text-secondary">
                    {entry.event_date ? new Date(entry.event_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-primary font-medium">
                    PR-{entry.purchase_request_id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-6 py-4 text-secondary">{entry.project_name || 'Unnamed Project'}</td>
                  <td className="px-6 py-4 text-secondary">
                    <div>{entry.contractor_name || '—'}</div>
                    <div className="text-xs text-secondary/70">Vendor: {entry.vendor_name || '—'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={entry.event_type === 'deployment' ? 'text-accent-blue' : 'text-success'}>
                      {entry.event_type === 'deployment' ? 'Deployment' : 'Return'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-primary">{formatCurrency(entry.amount)}</td>
                  <td className="px-6 py-4 text-primary">{formatCurrency(entry.running_principal_outstanding)}</td>
                  <td className="px-6 py-4 text-accent-blue">{formatCurrency(entry.running_fee_outstanding)}</td>
                  <td className="px-6 py-4 text-accent-blue font-medium">{formatCurrency(entry.running_total_outstanding)}</td>
                </tr>
              ))}
              {fundingLedger.length === 0 && (
                <tr>
                  <td className="px-6 py-6 text-center text-secondary" colSpan={9}>
                    No funding ledger entries available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 bg-neutral-dark rounded-lg border border-neutral-medium overflow-hidden">
        <div className="p-6 border-b border-neutral-medium flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primary">Investor Unit Register</h2>
            <p className="text-sm text-secondary">Pool ownership, unit balances, and current gross / net value by investor.</p>
          </div>
          <div className="text-sm text-secondary">
            {investorPositions.length} investors
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-neutral-darker text-secondary text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-4">Investor</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Committed</th>
                <th className="px-6 py-4">Units Held</th>
                <th className="px-6 py-4">Ownership</th>
                <th className="px-6 py-4">Entry NAV</th>
                <th className="px-6 py-4">Gross Value</th>
                <th className="px-6 py-4">Net Value</th>
                <th className="px-6 py-4">Net Gain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-medium">
              {investorPositions.map((investor) => (
                <tr key={investor.investor_id} className="hover:bg-neutral-medium/20">
                  <td className="px-6 py-4">
                    <div className="text-primary font-medium">{investor.investor_name || 'Investor'}</div>
                    <div className="text-xs text-secondary">{investor.investor_email || '—'}</div>
                  </td>
                  <td className="px-6 py-4 text-secondary">
                    {investor.investor_type || '—'}
                  </td>
                  <td className="px-6 py-4 text-primary">
                    {formatCurrency(investor.contributed_capital)}
                  </td>
                  <td className="px-6 py-4 text-primary">
                    {investor.units_held.toFixed(4)}
                  </td>
                  <td className="px-6 py-4 text-secondary">
                    {investor.ownership_percent.toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 text-secondary">
                    ₹{investor.entry_nav_per_unit.toFixed(4)}
                  </td>
                  <td className="px-6 py-4 text-primary">
                    {formatCurrency(investor.gross_value)}
                  </td>
                  <td className="px-6 py-4 text-primary">
                    {formatCurrency(investor.net_value)}
                  </td>
                  <td className="px-6 py-4 text-accent-blue">
                    {formatCurrency(investor.net_gain)}
                  </td>
                </tr>
              ))}
              {investorPositions.length === 0 && (
                <tr>
                  <td className="px-6 py-6 text-center text-secondary" colSpan={9}>
                    No investor data available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminFinanceDashboard;
