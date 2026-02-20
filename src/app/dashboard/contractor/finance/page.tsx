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

type EditablePurchaseRequestItem = {
  id: string;
  item_description: string | null;
  requested_qty: number;
  unit_rate: number | null;
  tax_percent: number | null;
  hsn_code: string | null;
  material_name: string;
  unit: string;
};

type EditablePurchaseRequest = {
  id: string;
  status: string;
  remarks: string | null;
  editable: boolean;
  items: EditablePurchaseRequestItem[];
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
  const [editingRequest, setEditingRequest] = useState<EditablePurchaseRequest | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const canEditRequest = (status: string) => {
    const normalized = status.toLowerCase();
    return normalized === 'draft' || normalized === 'submitted' || normalized === 'rejected';
  };

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

  useEffect(() => {
    fetchOverview();
  }, []);

  const openEditRequestModal = async (requestId: string) => {
    try {
      setEditLoading(true);
      const response = await fetch(`/api/purchase-requests/${requestId}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load purchase request');
      }
      setEditingRequest(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load purchase request');
    } finally {
      setEditLoading(false);
    }
  };

  const updateEditItem = (itemId: string, field: keyof EditablePurchaseRequestItem, value: string) => {
    if (!editingRequest) return;
    const nextItems = editingRequest.items.map((item) => {
      if (item.id !== itemId) return item;
      if (field === 'hsn_code') {
        return { ...item, hsn_code: value.toUpperCase().slice(0, 16) || null };
      }
      if (field === 'item_description') {
        return { ...item, item_description: value || null };
      }
      if (field === 'requested_qty' || field === 'unit_rate' || field === 'tax_percent') {
        const parsed = value === '' ? null : Number(value);
        if (field === 'requested_qty') {
          return { ...item, requested_qty: Number.isFinite(parsed as number) ? (parsed as number) : 0 };
        }
        return { ...item, [field]: Number.isFinite(parsed as number) ? (parsed as number) : null };
      }
      return item;
    });
    setEditingRequest({ ...editingRequest, items: nextItems });
  };

  const saveEditedRequest = async () => {
    if (!editingRequest) return;

    const invalidItem = editingRequest.items.find((item) => !Number.isFinite(item.requested_qty) || item.requested_qty <= 0);
    if (invalidItem) {
      setError('Requested quantity must be greater than zero for all items');
      return;
    }

    try {
      setSavingEdit(true);
      const response = await fetch(`/api/purchase-requests/${editingRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remarks: editingRequest.remarks || null,
          items: editingRequest.items.map((item) => ({
            id: item.id,
            item_description: item.item_description,
            requested_qty: item.requested_qty,
            unit_rate: item.unit_rate,
            tax_percent: item.tax_percent,
            hsn_code: item.hsn_code
          }))
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update purchase request');
      }

      setEditingRequest(null);
      await fetchOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update purchase request');
    } finally {
      setSavingEdit(false);
    }
  };

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
                      <th className="px-6 py-4">Action</th>
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
                        <td className="px-6 py-4">
                          {canEditRequest(request.status) ? (
                            <button
                              type="button"
                              onClick={() => openEditRequestModal(request.id)}
                              className="px-3 py-1.5 text-xs font-medium rounded border border-accent-amber/40 text-accent-amber hover:bg-accent-amber/10 transition-colors"
                            >
                              Edit
                            </button>
                          ) : (
                            <span className="text-xs text-secondary">Locked</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {requests.length === 0 && (
                      <tr>
                        <td className="px-6 py-6 text-center text-secondary" colSpan={9}>
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

      {(editingRequest || editLoading) && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-neutral-dark border border-neutral-medium rounded-lg">
            <div className="p-6 border-b border-neutral-medium flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-primary">Edit Purchase Request</h2>
                {editingRequest && (
                  <p className="text-xs text-secondary mt-1">
                    Request ID: {editingRequest.id.slice(0, 8)}… · Status: {editingRequest.status}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setEditingRequest(null)}
                className="text-secondary hover:text-primary text-xl"
              >
                ×
              </button>
            </div>

            {editLoading ? (
              <div className="p-8 text-center text-secondary">Loading purchase request...</div>
            ) : editingRequest ? (
              <div className="p-6 space-y-5">
                {!editingRequest.editable && (
                  <div className="bg-yellow-900/20 border border-yellow-700/40 text-yellow-300 px-4 py-3 rounded-lg text-sm">
                    This request is no longer editable because it has already moved to approval/funding workflow.
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Remarks</label>
                  <textarea
                    value={editingRequest.remarks || ''}
                    onChange={(e) => setEditingRequest({ ...editingRequest, remarks: e.target.value })}
                    rows={2}
                    disabled={!editingRequest.editable}
                    className="w-full px-3 py-2 rounded-md bg-neutral-darker border border-neutral-medium text-primary focus:outline-none focus:border-accent-amber disabled:opacity-60"
                  />
                </div>

                <div className="overflow-x-auto border border-neutral-medium rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-neutral-darker text-secondary">
                      <tr>
                        <th className="px-4 py-3 text-left">Item</th>
                        <th className="px-4 py-3 text-left">Requested Qty</th>
                        <th className="px-4 py-3 text-left">Unit</th>
                        <th className="px-4 py-3 text-left">Rate</th>
                        <th className="px-4 py-3 text-left">Tax %</th>
                        <th className="px-4 py-3 text-left">HSN</th>
                        <th className="px-4 py-3 text-left">Description / Specs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-medium">
                      {editingRequest.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-primary">{item.material_name}</td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0.001"
                              step="0.001"
                              value={item.requested_qty}
                              disabled={!editingRequest.editable}
                              onChange={(e) => updateEditItem(item.id, 'requested_qty', e.target.value)}
                              className="w-28 px-2 py-1 rounded bg-neutral-darker border border-neutral-medium text-primary focus:outline-none focus:border-accent-amber disabled:opacity-60"
                            />
                          </td>
                          <td className="px-4 py-3 text-secondary">{item.unit}</td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_rate ?? ''}
                              disabled={!editingRequest.editable}
                              onChange={(e) => updateEditItem(item.id, 'unit_rate', e.target.value)}
                              className="w-28 px-2 py-1 rounded bg-neutral-darker border border-neutral-medium text-primary focus:outline-none focus:border-accent-amber disabled:opacity-60"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.tax_percent ?? 0}
                              disabled={!editingRequest.editable}
                              onChange={(e) => updateEditItem(item.id, 'tax_percent', e.target.value)}
                              className="w-20 px-2 py-1 rounded bg-neutral-darker border border-neutral-medium text-primary focus:outline-none focus:border-accent-amber disabled:opacity-60"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.hsn_code ?? ''}
                              disabled={!editingRequest.editable}
                              onChange={(e) => updateEditItem(item.id, 'hsn_code', e.target.value)}
                              className="w-32 px-2 py-1 rounded bg-neutral-darker border border-neutral-medium text-primary focus:outline-none focus:border-accent-amber disabled:opacity-60"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <textarea
                              value={item.item_description ?? ''}
                              disabled={!editingRequest.editable}
                              onChange={(e) => updateEditItem(item.id, 'item_description', e.target.value)}
                              rows={2}
                              className="w-64 px-2 py-1 rounded bg-neutral-darker border border-neutral-medium text-primary focus:outline-none focus:border-accent-amber disabled:opacity-60"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingRequest(null)}
                    className="px-4 py-2 text-sm text-secondary hover:text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveEditedRequest}
                    disabled={!editingRequest.editable || savingEdit}
                    className="px-4 py-2 text-sm rounded bg-accent-amber text-neutral-darker hover:bg-accent-amber/90 disabled:opacity-50"
                  >
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </ContractorDashboardLayout>
  );
}
