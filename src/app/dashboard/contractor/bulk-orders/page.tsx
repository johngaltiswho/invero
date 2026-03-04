'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';
import { Button } from '@/components';

type Material = {
  id: string;
  name: string;
  unit?: string | null;
  hsn_code?: string | null;
};

type BulkOrder = {
  id: string;
  material_id: string;
  hsn_code?: string | null;
  ordered_qty: number;
  uom: string;
  supplier_unit_rate?: number | null;
  tax_percent?: number | null;
  invoice_total?: number | null;
  status: string;
  created_at: string;
  material?: {
    id: string;
    name: string;
    hsn_code?: string | null;
    unit?: string | null;
  } | null;
};

type MaterialLimit = {
  id: string;
  material_id: string;
  monthly_usage_qty: number;
  notes?: string | null;
  updated_at: string;
  material?: {
    id: string;
    name: string;
    unit?: string | null;
    hsn_code?: string | null;
  } | null;
};

const LOCKED_HSN_STATUSES = new Set(['invoiced', 'active_repayment', 'closed', 'defaulted']);

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);

export default function BulkOrdersPage(): React.ReactElement {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [orders, setOrders] = useState<BulkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingLimit, setSavingLimit] = useState(false);
  const [creating, setCreating] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [savingHsnForOrderId, setSavingHsnForOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    material_id: '',
    ordered_qty: '',
    uom: '',
    supplier_unit_rate: '',
    tax_percent: '18',
    tenure_months: '3',
    supplier_id: '',
    hsn_code_override: ''
  });

  const [limitForm, setLimitForm] = useState({
    material_id: '',
    monthly_usage_qty: '',
    notes: ''
  });

  const [materialLimits, setMaterialLimits] = useState<MaterialLimit[]>([]);

  const [simulation, setSimulation] = useState<{
    base_cost: number;
    platform_fee_amount: number;
    tax_amount: number;
    invoice_total: number;
    tenure_months: number;
    total_interest: number;
    total_repayment: number;
    average_emi: number;
    monthly_usage_qty: number | null;
    max_order_qty: number | null;
    current_outstanding_value: number;
    max_outstanding_value: number | null;
    headroom_value: number | null;
    can_create_order: boolean;
    guardrail_reasons: string[];
    monthly_installments: Array<{
      month: number;
      principal_component: number;
      interest_component: number;
      emi_amount: number;
      outstanding_after: number;
    }>;
    material_hsn_code?: string | null;
  } | null>(null);

  const selectedMaterial = useMemo(
    () => materials.find((m) => m.id === form.material_id) || null,
    [materials, form.material_id]
  );

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setMaterialsError(null);
    try {
      const [materialsRes, ordersRes, limitsRes] = await Promise.all([
        fetch('/api/materials?limit=500&include_pending=true'),
        fetch('/api/bulk-orders?limit=200'),
        fetch('/api/contractor/material-limits')
      ]);
      const [materialsJson, ordersJson, limitsJson] = await Promise.all([
        materialsRes.json(),
        ordersRes.json(),
        limitsRes.json()
      ]);

      if (!materialsRes.ok || !materialsJson.success) {
        setMaterials([]);
        setMaterialsError(materialsJson.error || 'Failed to load materials');
      } else {
        setMaterials(materialsJson.data || []);
      }
      if (!ordersRes.ok || !ordersJson.success) {
        throw new Error(ordersJson.error || 'Failed to load bulk orders');
      }
      if (!limitsRes.ok || !limitsJson.success) {
        throw new Error(limitsJson.error || 'Failed to load material usage baselines');
      }

      setOrders(ordersJson.data || []);
      setMaterialLimits(limitsJson.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveMaterialLimit = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!limitForm.material_id || !limitForm.monthly_usage_qty) {
      setError('Select material and enter monthly usage quantity.');
      return;
    }

    setSavingLimit(true);
    try {
      const response = await fetch('/api/contractor/material-limits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: limitForm.material_id,
          monthly_usage_qty: Number(limitForm.monthly_usage_qty),
          notes: limitForm.notes || undefined
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save material usage baseline');
      }

      setLimitForm({ material_id: '', monthly_usage_qty: '', notes: '' });
      setSuccessMessage('Material usage baseline saved.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save material usage baseline');
    } finally {
      setSavingLimit(false);
    }
  };

  const runSimulation = async () => {
    setError(null);
    setSimulation(null);

    if (!form.material_id || !form.ordered_qty) {
      setError('Select material and enter quantity to simulate.');
      return;
    }

    setSimulating(true);
    try {
      const response = await fetch('/api/bulk-orders/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: form.material_id,
          ordered_qty: Number(form.ordered_qty),
          supplier_unit_rate: Number(form.supplier_unit_rate || 0),
          tax_percent: Number(form.tax_percent || 0),
          tenure_months: Number(form.tenure_months || 0) || 3
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Simulation failed');
      }
      setSimulation(result.data);
      if (!form.uom && selectedMaterial?.unit) {
        setForm((prev) => ({ ...prev, uom: selectedMaterial.unit || '' }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  const createOrder = async () => {
    setError(null);
    setSuccessMessage(null);
    if (!form.material_id || !form.ordered_qty || !form.uom) {
      setError('Material, quantity and UOM are required.');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/bulk-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: form.material_id,
          ordered_qty: Number(form.ordered_qty),
          uom: form.uom,
          supplier_unit_rate: Number(form.supplier_unit_rate || 0),
          tax_percent: Number(form.tax_percent || 0),
          tenure_months: Number(form.tenure_months || 0) || undefined,
          supplier_id: form.supplier_id || undefined,
          hsn_code: form.hsn_code_override?.trim() || undefined
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        const guardrailError = Array.isArray(result.guardrail_reasons)
          ? `${result.error || 'Failed to create bulk order'}: ${result.guardrail_reasons.join(', ')}`
          : (result.error || 'Failed to create bulk order');
        throw new Error(guardrailError);
      }

      setForm({
        material_id: '',
        ordered_qty: '',
        uom: '',
        supplier_unit_rate: '',
        tax_percent: '18',
        tenure_months: '3',
        supplier_id: '',
        hsn_code_override: ''
      });
      setSimulation(null);
      setSuccessMessage('Bulk order submitted for admin approval.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bulk order');
    } finally {
      setCreating(false);
    }
  };

  const updateHsn = async (order: BulkOrder, hsnCode: string) => {
    if (LOCKED_HSN_STATUSES.has(order.status)) return;
    setSavingHsnForOrderId(order.id);
    setError(null);
    try {
      const response = await fetch(`/api/bulk-orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hsn_code: hsnCode.trim() || null })
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update HSN');
      }
      setOrders((prev) => prev.map((o) => (o.id === order.id ? result.data : o)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update HSN');
    } finally {
      setSavingHsnForOrderId(null);
    }
  };

  return (
    <ContractorDashboardLayout activeTab="bulk-orders">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Bulk Orders</h1>
          <p className="text-secondary">Create MOQ-based bulk procurement orders and manage HSN before invoicing.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-error/30 bg-error/10 p-3 text-error text-sm">
            {error}
          </div>
        )}
        {materialsError && (
          <div className="mb-6 rounded-lg border border-accent-amber/30 bg-accent-amber/10 p-3 text-accent-amber text-sm">
            Material catalog is temporarily unavailable. Existing bulk orders and baselines still work.
          </div>
        )}
        {successMessage && (
          <div className="mb-6 rounded-lg border border-success/30 bg-success/10 p-3 text-success text-sm">
            {successMessage}
          </div>
        )}

        <div className="bg-neutral-dark border border-neutral-medium rounded-lg p-5 mb-8">
          <h2 className="text-lg font-semibold text-primary mb-4">Material Usage Baseline</h2>
          <p className="text-sm text-secondary mb-4">
            Set monthly usage per material. This controls your quantity and outstanding guardrails.
          </p>
          <div className="grid md:grid-cols-4 gap-3 mb-4">
            <select
              value={limitForm.material_id}
              onChange={(e) => setLimitForm((prev) => ({ ...prev, material_id: e.target.value }))}
              className="px-3 py-2 bg-neutral-darker border border-neutral-medium rounded text-primary"
            >
              <option value="">Select material</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.001"
              min="0"
              value={limitForm.monthly_usage_qty}
              onChange={(e) => setLimitForm((prev) => ({ ...prev, monthly_usage_qty: e.target.value }))}
              placeholder="Monthly usage qty"
              className="px-3 py-2 bg-neutral-darker border border-neutral-medium rounded text-primary"
            />
            <input
              type="text"
              value={limitForm.notes}
              onChange={(e) => setLimitForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes (optional)"
              className="px-3 py-2 bg-neutral-darker border border-neutral-medium rounded text-primary"
            />
            <Button onClick={saveMaterialLimit} disabled={savingLimit}>
              {savingLimit ? 'Saving...' : 'Save Baseline'}
            </Button>
          </div>

          <div className="overflow-x-auto border border-neutral-medium rounded">
            <table className="w-full text-sm">
              <thead className="bg-neutral-medium/50">
                <tr>
                  <th className="px-3 py-2 text-left text-primary">Material</th>
                  <th className="px-3 py-2 text-left text-primary">HSN</th>
                  <th className="px-3 py-2 text-left text-primary">Monthly Usage</th>
                  <th className="px-3 py-2 text-left text-primary">Updated</th>
                </tr>
              </thead>
              <tbody>
                {materialLimits.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-secondary">
                      No usage baselines yet.
                    </td>
                  </tr>
                ) : (
                  materialLimits.map((limit) => (
                    <tr key={limit.id} className="border-t border-neutral-medium">
                      <td className="px-3 py-2 text-primary">{limit.material?.name || limit.material_id}</td>
                      <td className="px-3 py-2 text-secondary">{limit.material?.hsn_code || '—'}</td>
                      <td className="px-3 py-2 text-primary">
                        {limit.monthly_usage_qty} {limit.material?.unit || ''}
                      </td>
                      <td className="px-3 py-2 text-secondary">
                        {new Date(limit.updated_at).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1 bg-neutral-dark border border-neutral-medium rounded-lg p-5">
            <h2 className="text-lg font-semibold text-primary mb-4">Create Bulk Order</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-secondary mb-1">Material *</label>
                <select
                  value={form.material_id}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    const mat = materials.find((m) => m.id === nextId);
                    setForm((prev) => ({
                      ...prev,
                      material_id: nextId,
                      uom: mat?.unit || prev.uom,
                      hsn_code_override: ''
                    }));
                  }}
                  className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded text-primary"
                >
                  <option value="">Select material</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-secondary mb-1">Qty *</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={form.ordered_qty}
                    onChange={(e) => setForm((prev) => ({ ...prev, ordered_qty: e.target.value }))}
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded text-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-secondary mb-1">UOM *</label>
                  <input
                    type="text"
                    value={form.uom}
                    onChange={(e) => setForm((prev) => ({ ...prev, uom: e.target.value }))}
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-secondary mb-1">Supplier Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.supplier_unit_rate}
                    onChange={(e) => setForm((prev) => ({ ...prev, supplier_unit_rate: e.target.value }))}
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded text-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-secondary mb-1">Tax %</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.tax_percent}
                    onChange={(e) => setForm((prev) => ({ ...prev, tax_percent: e.target.value }))}
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded text-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-secondary mb-1">Tenure (months)</label>
                <input
                  type="number"
                  min="1"
                  value={form.tenure_months}
                  onChange={(e) => setForm((prev) => ({ ...prev, tenure_months: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded text-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-secondary mb-1">Material Master HSN</label>
                <input
                  type="text"
                  readOnly
                  value={selectedMaterial?.hsn_code || simulation?.material_hsn_code || ''}
                  className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded text-secondary"
                />
              </div>

              <div>
                <label className="block text-xs text-secondary mb-1">HSN Override (optional)</label>
                <input
                  type="text"
                  value={form.hsn_code_override}
                  onChange={(e) => setForm((prev) => ({ ...prev, hsn_code_override: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded text-primary"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={runSimulation} variant="outline" className="w-full" disabled={simulating}>
                  {simulating ? 'Simulating...' : 'Simulate'}
                </Button>
                <Button
                  onClick={createOrder}
                  className="w-full"
                  disabled={creating || (simulation ? !simulation.can_create_order : false)}
                >
                  {creating ? 'Submitting...' : 'Submit Order'}
                </Button>
              </div>
              {simulation && !simulation.can_create_order && (
                <p className="text-xs text-error">
                  Blocked: {simulation.guardrail_reasons.join(' | ')}
                </p>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-neutral-dark border border-neutral-medium rounded-lg p-5">
            <h2 className="text-lg font-semibold text-primary mb-4">Simulation Summary</h2>
            {!simulation ? (
              <p className="text-secondary text-sm">Run a simulation to preview cost, fees, tax, and invoice total.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className="bg-neutral-darker border border-neutral-medium rounded p-3">
                  <div className="text-secondary">Base Cost</div>
                  <div className="text-primary font-semibold">{formatCurrency(simulation.base_cost)}</div>
                </div>
                <div className="bg-neutral-darker border border-neutral-medium rounded p-3">
                  <div className="text-secondary">Platform Fee</div>
                  <div className="text-primary font-semibold">{formatCurrency(simulation.platform_fee_amount)}</div>
                </div>
                <div className="bg-neutral-darker border border-neutral-medium rounded p-3">
                  <div className="text-secondary">Tax Amount</div>
                  <div className="text-primary font-semibold">{formatCurrency(simulation.tax_amount)}</div>
                </div>
                <div className="bg-neutral-darker border border-neutral-medium rounded p-3">
                  <div className="text-secondary">Invoice Total</div>
                  <div className="text-accent-amber font-semibold">{formatCurrency(simulation.invoice_total)}</div>
                </div>
                <div className="bg-neutral-darker border border-neutral-medium rounded p-3">
                  <div className="text-secondary">Tenure</div>
                  <div className="text-primary font-semibold">{simulation.tenure_months} months</div>
                </div>
                <div className="bg-neutral-darker border border-neutral-medium rounded p-3">
                  <div className="text-secondary">Total Interest (Estimated)</div>
                  <div className="text-primary font-semibold">{formatCurrency(simulation.total_interest)}</div>
                </div>
                <div className="bg-neutral-darker border border-neutral-medium rounded p-3">
                  <div className="text-secondary">Total Repayment</div>
                  <div className="text-accent-amber font-semibold">{formatCurrency(simulation.total_repayment)}</div>
                </div>
                <div className="bg-neutral-darker border border-neutral-medium rounded p-3 md:col-span-2">
                  <div className="text-secondary">Average Monthly Repayment</div>
                  <div className="text-primary font-semibold">{formatCurrency(simulation.average_emi)}</div>
                </div>
                <div className="bg-neutral-darker border border-neutral-medium rounded p-3">
                  <div className="text-secondary">Declared Usage</div>
                  <div className="text-primary font-semibold">
                    {simulation.monthly_usage_qty === null ? 'Not set' : simulation.monthly_usage_qty.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="bg-neutral-darker border border-neutral-medium rounded p-3">
                  <div className="text-secondary">Max Allowed Qty</div>
                  <div className="text-primary font-semibold">
                    {simulation.max_order_qty === null ? '—' : simulation.max_order_qty.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="bg-neutral-darker border border-neutral-medium rounded p-3">
                  <div className="text-secondary">Current Outstanding</div>
                  <div className="text-primary font-semibold">
                    {formatCurrency(simulation.current_outstanding_value || 0)}
                  </div>
                </div>
                <div className="bg-neutral-darker border border-neutral-medium rounded p-3">
                  <div className="text-secondary">Outstanding Cap</div>
                  <div className="text-primary font-semibold">
                    {simulation.max_outstanding_value === null
                      ? '—'
                      : formatCurrency(simulation.max_outstanding_value)}
                  </div>
                </div>
                <div className="bg-neutral-darker border border-neutral-medium rounded p-3 md:col-span-2">
                  <div className="text-secondary">Headroom</div>
                  <div className="text-primary font-semibold">
                    {simulation.headroom_value === null
                      ? '—'
                      : formatCurrency(simulation.headroom_value)}
                  </div>
                </div>
              </div>
            )}

            {simulation && (
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-primary mb-2">Deferred Payment Schedule</h3>
                <div className="overflow-x-auto border border-neutral-medium rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-medium/50">
                      <tr>
                        <th className="px-3 py-2 text-left text-primary">Month</th>
                        <th className="px-3 py-2 text-left text-primary">Principal</th>
                        <th className="px-3 py-2 text-left text-primary">Interest</th>
                        <th className="px-3 py-2 text-left text-primary">Monthly Repayment</th>
                        <th className="px-3 py-2 text-left text-primary">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulation.monthly_installments.map((row) => (
                        <tr key={row.month} className="border-t border-neutral-medium">
                          <td className="px-3 py-2 text-secondary">{row.month}</td>
                          <td className="px-3 py-2 text-primary">{formatCurrency(row.principal_component)}</td>
                          <td className="px-3 py-2 text-primary">{formatCurrency(row.interest_component)}</td>
                          <td className="px-3 py-2 text-accent-amber">{formatCurrency(row.emi_amount)}</td>
                          <td className="px-3 py-2 text-secondary">{formatCurrency(row.outstanding_after)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-neutral-dark border border-neutral-medium rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-medium">
            <h2 className="text-lg font-semibold text-primary">My Bulk Orders</h2>
          </div>
          {loading ? (
            <div className="p-8 text-secondary">Loading...</div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-secondary">No bulk orders yet.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-neutral-medium/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm text-primary">Material</th>
                  <th className="px-4 py-3 text-left text-sm text-primary">Qty</th>
                  <th className="px-4 py-3 text-left text-sm text-primary">Status</th>
                  <th className="px-4 py-3 text-left text-sm text-primary">HSN</th>
                  <th className="px-4 py-3 text-left text-sm text-primary">Invoice Total</th>
                  <th className="px-4 py-3 text-left text-sm text-primary">Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-neutral-medium">
                    <td className="px-4 py-3 text-sm text-primary">
                      {order.material?.name || order.material_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary">
                      {order.ordered_qty} {order.uom}
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary">{order.status}</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        defaultValue={order.hsn_code || ''}
                        disabled={LOCKED_HSN_STATUSES.has(order.status) || savingHsnForOrderId === order.id}
                        onBlur={(e) => {
                          const next = e.target.value || '';
                          if ((order.hsn_code || '') !== next) {
                            updateHsn(order, next);
                          }
                        }}
                        className="w-40 px-2 py-1 text-sm rounded border border-neutral-medium bg-neutral-darker text-primary disabled:opacity-50"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-primary">
                      {formatCurrency(Number(order.invoice_total || 0))}
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary">
                      {new Date(order.created_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ContractorDashboardLayout>
  );
}
