'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';

type FinanceSummary = {
  total_requests: number;
  total_requested_value: number;
  total_funded: number;
  total_platform_fee: number;
  total_participation_fee: number;
  total_due: number;
  total_projects: number;
};

type ProjectFinanceRow = {
  project_id: string;
  project_name: string | null;
  total_requested: number;
  total_funded: number;
  total_platform_fee: number;
  total_participation_fee: number;
  total_due: number;
  request_count: number;
};

type PurchaseRequestRow = {
  id: string;
  project_id: string | null;
  project_name: string | null;
  status: string;
  created_at: string | null;
  total_requested: number;
  total_funded: number;
  platform_fee: number;
  participation_fee: number;
  total_due: number;
  days_outstanding: number;
};

type ContractorTerms = {
  platform_fee_rate: number;
  platform_fee_cap: number;
  participation_fee_rate_daily: number;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);

const getStatusBadge = (status: string) => {
  const normalized = status.toLowerCase();
  const styles: Record<string, string> = {
    draft: 'bg-neutral-medium/30 text-secondary border-neutral-medium/50',
    submitted: 'bg-accent-amber/10 text-accent-amber border-accent-amber/30',
    approved: 'bg-accent-blue/10 text-accent-blue border-accent-blue/30',
    funded: 'bg-success/10 text-success border-success/30',
    po_generated: 'bg-accent-purple/10 text-accent-purple border-accent-purple/30',
    completed: 'bg-success/20 text-success border-success/40',
    rejected: 'bg-error/10 text-error border-error/30'
  };

  return styles[normalized] || 'bg-neutral-medium/20 text-secondary border-neutral-medium/40';
};

export default function ContractorFinancePage(): React.ReactElement {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [projects, setProjects] = useState<ProjectFinanceRow[]>([]);
  const [requests, setRequests] = useState<PurchaseRequestRow[]>([]);
  const [terms, setTerms] = useState<ContractorTerms | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/contractor/finance/overview');
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load finance overview');
        }
        setSummary(data.summary);
        setProjects(data.projects || []);
        setRequests(data.requests || []);
        setTerms(data.terms || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load finance overview');
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  return (
    <ContractorDashboardLayout activeTab="finance">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Finance Overview</h1>
          <p className="text-secondary">
            Track funded materials, outstanding balances, and purchase request totals across your projects.
          </p>
        </div>

        {error && (
          <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center">
              <span className="text-lg mr-2">⚠️</span>
              {error}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-orange"></div>
            <span className="ml-3 text-secondary">Loading finance overview...</span>
          </div>
        ) : (
          <>
            {summary && (
              <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                  <div className="text-accent-amber text-sm font-mono mb-2">MATERIALS FUNDED</div>
                  <div className="text-2xl font-bold text-primary mb-1">
                    {formatCurrency(summary.total_funded)}
                  </div>
                  <div className="text-xs text-secondary">{summary.total_requests} purchase requests</div>
                </div>
                <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                  <div className="text-accent-amber text-sm font-mono mb-2">PLATFORM FEES</div>
                  <div className="text-2xl font-bold text-success mb-1">
                    {formatCurrency(summary.total_platform_fee)}
                  </div>
                  <div className="text-xs text-secondary">Applied per purchase request</div>
                </div>
                <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                  <div className="text-accent-amber text-sm font-mono mb-2">PROJECT PARTICIPATION FEE</div>
                  <div className="text-2xl font-bold text-accent-blue mb-1">
                    {formatCurrency(summary.total_participation_fee)}
                  </div>
                  <div className="text-xs text-secondary">Applied on funded balance</div>
                </div>
                <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                  <div className="text-accent-amber text-sm font-mono mb-2">TOTAL DUE</div>
                  <div className="text-2xl font-bold text-primary mb-1">
                    {formatCurrency(summary.total_due)}
                  </div>
                  <div className="text-xs text-secondary">Across {summary.total_projects} projects</div>
                </div>
              </div>
            )}

            {terms && (
              <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6 mb-8">
                <h2 className="text-lg font-semibold text-primary mb-4">Financing Terms</h2>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-neutral-darker/60 p-4 rounded-lg border border-neutral-medium">
                    <div className="text-secondary mb-1">Platform Fee</div>
                    <div className="text-primary font-semibold">
                      {(terms.platform_fee_rate * 100).toFixed(2)}% (cap {formatCurrency(terms.platform_fee_cap)})
                    </div>
                  </div>
                  <div className="bg-neutral-darker/60 p-4 rounded-lg border border-neutral-medium">
                    <div className="text-secondary mb-1">Project Participation Fee (Daily)</div>
                    <div className="text-primary font-semibold">
                    {(terms.participation_fee_rate_daily * 100).toFixed(2)}% per day
                    </div>
                  </div>
                  <div className="bg-neutral-darker/60 p-4 rounded-lg border border-neutral-medium">
                    <div className="text-secondary mb-1">Applied To</div>
                    <div className="text-primary font-semibold">Outstanding funded balance</div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-neutral-dark rounded-lg border border-neutral-medium overflow-hidden">
              <div className="p-6 border-b border-neutral-medium flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-primary">Project Purchase Summary</h2>
                  <p className="text-sm text-secondary">Aggregated funding and outstanding amounts by project</p>
                </div>
                <div className="text-sm text-secondary">{projects.length} projects</div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-neutral-darker text-secondary text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-6 py-4">Project</th>
                      <th className="px-6 py-4">Requests</th>
                      <th className="px-6 py-4">Request Value</th>
                      <th className="px-6 py-4">Funded</th>
                      <th className="px-6 py-4">Platform Fee</th>
                      <th className="px-6 py-4">Project Participation Fee</th>
                      <th className="px-6 py-4">Total Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-medium">
                    {projects.map((project) => (
                      <tr key={project.project_id} className="hover:bg-neutral-medium/20">
                        <td className="px-6 py-4 text-primary font-medium">
                          {project.project_name || 'Unnamed Project'}
                        </td>
                        <td className="px-6 py-4 text-secondary">{project.request_count}</td>
                        <td className="px-6 py-4 text-primary">
                          {formatCurrency(project.total_requested)}
                        </td>
                        <td className="px-6 py-4 text-success">
                          {formatCurrency(project.total_funded)}
                        </td>
                        <td className="px-6 py-4 text-accent-amber">
                          {formatCurrency(project.total_platform_fee)}
                        </td>
                        <td className="px-6 py-4 text-accent-blue">
                          {formatCurrency(project.total_participation_fee)}
                        </td>
                        <td className="px-6 py-4 text-primary font-medium">
                          {formatCurrency(project.total_due)}
                        </td>
                      </tr>
                    ))}
                    {projects.length === 0 && (
                      <tr>
                        <td className="px-6 py-6 text-center text-secondary" colSpan={6}>
                          No purchase request funding data available yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-neutral-dark rounded-lg border border-neutral-medium overflow-hidden mt-8">
              <div className="p-6 border-b border-neutral-medium flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-primary">Purchase Requests</h2>
                  <p className="text-sm text-secondary">Each purchase request with funding and outstanding amounts</p>
                </div>
                <div className="text-sm text-secondary">{requests.length} requests</div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-neutral-darker text-secondary text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-6 py-4">Request ID</th>
                      <th className="px-6 py-4">Project</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Request Value</th>
                      <th className="px-6 py-4">Funded</th>
                      <th className="px-6 py-4">Platform Fee</th>
                      <th className="px-6 py-4">Project Participation Fee</th>
                      <th className="px-6 py-4">Total Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-medium">
                    {requests.map((request) => (
                      <tr key={request.id} className="hover:bg-neutral-medium/20">
                        <td className="px-6 py-4 text-primary font-medium">
                          {request.id.slice(0, 8)}…
                        </td>
                        <td className="px-6 py-4 text-secondary">
                          {request.project_name || 'Unnamed Project'}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold capitalize ${getStatusBadge(request.status)}`}
                          >
                            {request.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-primary">
                          {formatCurrency(request.total_requested)}
                        </td>
                        <td className="px-6 py-4 text-success">
                          {formatCurrency(request.total_funded)}
                        </td>
                        <td className="px-6 py-4 text-accent-amber">
                          {formatCurrency(request.platform_fee)}
                        </td>
                        <td className="px-6 py-4 text-accent-blue">
                          {formatCurrency(request.participation_fee)}
                        </td>
                        <td className="px-6 py-4 text-primary font-medium">
                          {formatCurrency(request.total_due)}
                        </td>
                      </tr>
                    ))}
                    {requests.length === 0 && (
                      <tr>
                        <td className="px-6 py-6 text-center text-secondary" colSpan={8}>
                          No purchase requests available yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </ContractorDashboardLayout>
  );
}
