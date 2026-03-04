'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components';

type GuardrailCheck = {
  can_create_order: boolean;
  reasons: string[];
  monthly_usage_qty: number | null;
  max_order_qty: number | null;
  current_outstanding_value: number;
  max_outstanding_value: number | null;
  headroom_value: number | null;
};

type BulkOrderRow = {
  id: string;
  contractor_id: string;
  material_id: string;
  ordered_qty: number;
  uom: string;
  supplier_unit_rate: number;
  invoice_total: number;
  status: string;
  submitted_at?: string | null;
  approved_at?: string | null;
  created_at: string;
  rejection_reason?: string | null;
  contractor?: {
    id: string;
    company_name: string;
    contact_person?: string | null;
    bulk_order_multiplier?: number | null;
    bulk_outstanding_months_cap?: number | null;
    bulk_order_credit_limit?: number | null;
    bulk_supply_blocked?: boolean | null;
  } | null;
  material?: {
    id: string;
    name: string;
    unit?: string | null;
    hsn_code?: string | null;
  } | null;
  precheck?: {
    hard_block_flags: string[];
    can_approve_without_override: boolean;
    verification: {
      is_verified: boolean;
      status: string | null;
      verification_status: string | null;
    };
    guardrail: GuardrailCheck;
  };
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);

export default function AdminBulkOrdersDashboard(): React.ReactElement {
  const [rows, setRows] = useState<BulkOrderRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [rejectionReason, setRejectionReason] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [bulkSettingsDraft, setBulkSettingsDraft] = useState({
    bulk_order_multiplier: '1.5',
    bulk_outstanding_months_cap: '2',
    bulk_order_credit_limit: '',
    bulk_supply_blocked: false
  });

  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) || null,
    [rows, selectedId]
  );

  const loadRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set('status', statusFilter);
      qs.set('limit', '300');

      const res = await fetch(`/api/admin/bulk-orders?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load bulk orders');
      }
      setRows(json.data || []);
      if (!selectedId && json.data?.length) {
        setSelectedId(json.data[0].id);
      } else if (selectedId && !(json.data || []).some((row: BulkOrderRow) => row.id === selectedId)) {
        setSelectedId(json.data?.[0]?.id || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bulk orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, [statusFilter]);

  useEffect(() => {
    if (!selected?.contractor) return;
    setBulkSettingsDraft({
      bulk_order_multiplier: String(selected.contractor.bulk_order_multiplier ?? 1.5),
      bulk_outstanding_months_cap: String(selected.contractor.bulk_outstanding_months_cap ?? 2),
      bulk_order_credit_limit:
        selected.contractor.bulk_order_credit_limit === null || selected.contractor.bulk_order_credit_limit === undefined
          ? ''
          : String(selected.contractor.bulk_order_credit_limit),
      bulk_supply_blocked: Boolean(selected.contractor.bulk_supply_blocked)
    });
  }, [selected?.id]);

  const runAction = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!selected) return;
    setError(null);
    setActionLoading(action);
    try {
      const res = await fetch(`/api/admin/bulk-orders/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Action failed');
      }
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const saveBulkSettings = async () => {
    if (!selected?.contractor) return;
    setActionLoading('save_settings');
    setError(null);
    try {
      const res = await fetch(`/api/admin/contractors/${selected.contractor.id}/bulk-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulk_order_multiplier: Number(bulkSettingsDraft.bulk_order_multiplier),
          bulk_outstanding_months_cap: Number(bulkSettingsDraft.bulk_outstanding_months_cap),
          bulk_order_credit_limit:
            bulkSettingsDraft.bulk_order_credit_limit.trim() === ''
              ? null
              : Number(bulkSettingsDraft.bulk_order_credit_limit),
          bulk_supply_blocked: bulkSettingsDraft.bulk_supply_blocked
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save contractor settings');
      }
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contractor settings');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">Bulk Orders Queue</h1>
          <p className="text-secondary">Review submitted orders, pre-check guardrails, and approve or reject.</p>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-neutral-dark border border-neutral-medium rounded text-primary"
          >
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="ordered">Ordered</option>
            <option value="received">Received</option>
            <option value="invoiced">Invoiced</option>
            <option value="active_repayment">Active Repayment</option>
            <option value="closed">Closed</option>
            <option value="rejected">Rejected</option>
            <option value="">All</option>
          </select>
          <Button variant="outline" onClick={loadRows}>Refresh</Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded border border-error/30 bg-error/10 p-3 text-error text-sm">{error}</div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-neutral-dark rounded-lg border border-neutral-medium overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-medium text-primary font-semibold">
            Orders
          </div>
          {loading ? (
            <div className="p-5 text-secondary">Loading...</div>
          ) : rows.length === 0 ? (
            <div className="p-5 text-secondary">No orders found for this filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-medium/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-primary">Contractor</th>
                    <th className="px-3 py-2 text-left text-primary">Material</th>
                    <th className="px-3 py-2 text-left text-primary">Qty</th>
                    <th className="px-3 py-2 text-left text-primary">Invoice</th>
                    <th className="px-3 py-2 text-left text-primary">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-t border-neutral-medium cursor-pointer ${
                        selectedId === row.id ? 'bg-accent-amber/10' : ''
                      }`}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <td className="px-3 py-2 text-primary">{row.contractor?.company_name || '—'}</td>
                      <td className="px-3 py-2 text-secondary">{row.material?.name || row.material_id}</td>
                      <td className="px-3 py-2 text-secondary">{row.ordered_qty} {row.uom}</td>
                      <td className="px-3 py-2 text-primary">{formatCurrency(row.invoice_total || 0)}</td>
                      <td className="px-3 py-2 text-secondary">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-neutral-dark rounded-lg border border-neutral-medium p-5">
          {!selected ? (
            <div className="text-secondary">Select an order to review.</div>
          ) : (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-primary mb-2">Order Detail</h3>
                <div className="text-sm text-secondary">Contractor: {selected.contractor?.company_name || '—'}</div>
                <div className="text-sm text-secondary">Material: {selected.material?.name || selected.material_id}</div>
                <div className="text-sm text-secondary">Invoice Total: {formatCurrency(selected.invoice_total || 0)}</div>
                <div className="text-sm text-secondary">Status: {selected.status}</div>
              </div>

              <div className="border border-neutral-medium rounded p-3">
                <h4 className="text-sm font-semibold text-primary mb-2">Pre-check</h4>
                <div className="text-xs text-secondary mb-1">
                  Verification: {selected.precheck?.verification.is_verified ? 'Verified' : 'Not verified'}
                </div>
                <div className="text-xs text-secondary mb-1">
                  Guardrail: {selected.precheck?.guardrail.can_create_order ? 'Pass' : 'Fail'}
                </div>
                {selected.precheck?.hard_block_flags?.length ? (
                  <div className="text-xs text-error">Hard blocks: {selected.precheck.hard_block_flags.join(', ')}</div>
                ) : (
                  <div className="text-xs text-success">No hard block flags</div>
                )}
                {selected.precheck?.guardrail.reasons?.length ? (
                  <div className="text-xs text-accent-amber mt-2">
                    Reasons: {selected.precheck.guardrail.reasons.join(' | ')}
                  </div>
                ) : null}
              </div>

              <div className="border border-neutral-medium rounded p-3">
                <h4 className="text-sm font-semibold text-primary mb-2">Contractor Bulk Settings</h4>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.001"
                    value={bulkSettingsDraft.bulk_order_multiplier}
                    onChange={(e) => setBulkSettingsDraft((prev) => ({ ...prev, bulk_order_multiplier: e.target.value }))}
                    className="px-2 py-1 bg-neutral-darker border border-neutral-medium rounded text-primary text-sm"
                    placeholder="Multiplier"
                  />
                  <input
                    type="number"
                    step="0.001"
                    value={bulkSettingsDraft.bulk_outstanding_months_cap}
                    onChange={(e) => setBulkSettingsDraft((prev) => ({ ...prev, bulk_outstanding_months_cap: e.target.value }))}
                    className="px-2 py-1 bg-neutral-darker border border-neutral-medium rounded text-primary text-sm"
                    placeholder="Months cap"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={bulkSettingsDraft.bulk_order_credit_limit}
                    onChange={(e) => setBulkSettingsDraft((prev) => ({ ...prev, bulk_order_credit_limit: e.target.value }))}
                    className="px-2 py-1 bg-neutral-darker border border-neutral-medium rounded text-primary text-sm col-span-2"
                    placeholder="Credit limit (optional)"
                  />
                  <label className="text-xs text-secondary col-span-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={bulkSettingsDraft.bulk_supply_blocked}
                      onChange={(e) => setBulkSettingsDraft((prev) => ({ ...prev, bulk_supply_blocked: e.target.checked }))}
                    />
                    Supply blocked
                  </label>
                </div>
                <Button
                  className="mt-3 w-full"
                  variant="outline"
                  onClick={saveBulkSettings}
                  disabled={actionLoading === 'save_settings'}
                >
                  {actionLoading === 'save_settings' ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-primary">Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => runAction('approve')}
                    disabled={actionLoading !== null || selected.status !== 'submitted'}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => runAction('approve', { override: true, override_reason: overrideReason })}
                    disabled={actionLoading !== null || selected.status !== 'submitted' || !overrideReason.trim()}
                  >
                    Approve Override
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => runAction('mark_ordered')}
                    disabled={actionLoading !== null || selected.status !== 'approved'}
                  >
                    Mark Ordered
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => runAction('mark_received')}
                    disabled={actionLoading !== null || selected.status !== 'ordered'}
                  >
                    Mark Received
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => runAction('mark_invoiced')}
                    disabled={actionLoading !== null || selected.status !== 'received'}
                  >
                    Mark Invoiced
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => runAction('mark_active_repayment')}
                    disabled={actionLoading !== null || selected.status !== 'invoiced'}
                  >
                    Active Repayment
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => runAction('close')}
                    disabled={actionLoading !== null || selected.status !== 'active_repayment'}
                  >
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => runAction('default')}
                    disabled={actionLoading !== null || !['active_repayment', 'invoiced'].includes(selected.status)}
                  >
                    Mark Default
                  </Button>
                </div>

                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Override reason (for blocked approvals)"
                  className="w-full px-2 py-1 bg-neutral-darker border border-neutral-medium rounded text-primary text-sm"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Rejection reason"
                    className="flex-1 px-2 py-1 bg-neutral-darker border border-neutral-medium rounded text-primary text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => runAction('reject', { rejection_reason: rejectionReason })}
                    disabled={actionLoading !== null || !rejectionReason.trim()}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

