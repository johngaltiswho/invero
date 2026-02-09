'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components';

type FinanceSummary = {
  total_requests: number;
  total_requested_value: number;
  total_funded: number;
  total_returns: number;
  total_outstanding: number;
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
  total_outstanding: number;
  request_count: number;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);

const AdminFinanceDashboard: React.FC = () => {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [projects, setProjects] = useState<ProjectFinanceRow[]>([]);
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
        setProjects(data.projects || []);
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
            <div className="text-xs text-secondary">Funded minus returns</div>
          </div>
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">FUNDING REQUIRED</div>
            <div className="text-2xl font-bold text-accent-amber mb-1">
              {formatCurrency(summary.total_requested_value)}
            </div>
            <div className="text-xs text-secondary">
              {summary.total_projects} projects · {summary.total_contractors} contractors
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
                  <td className="px-6 py-4 text-accent-blue font-medium">
                    {formatCurrency(project.total_outstanding)}
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td className="px-6 py-6 text-center text-secondary" colSpan={7}>
                    No purchase request funding data available yet.
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
