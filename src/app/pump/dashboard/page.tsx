'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/Button';

interface PumpSession {
  id: string;
  pump_name: string;
  oem_name?: string | null;
  city?: string | null;
  state?: string | null;
}

interface ApprovalDetails {
  approval_id: string;
  vehicle_number: string;
  max_amount: number;
  max_liters: number;
  contractor_name: string;
  valid_until?: string;
}

interface ApprovalRow {
  id: string;
  approval_code: string;
  max_amount: number;
  max_liters: number;
  valid_until: string;
  status: 'pending' | 'filled' | 'expired' | 'cancelled';
  filled_at?: string | null;
  filled_quantity?: number | null;
  filled_amount?: number | null;
  vehicles?: {
    vehicle_number?: string;
    vehicle_type?: string;
  } | null;
  contractors?: {
    company_name?: string;
    contact_person?: string;
    phone?: string;
  } | null;
}

interface ApprovalSummary {
  pendingCount: number;
  todayFilledCount: number;
  todayLitersDispensed: number;
  todayAmountDispensed: number;
  monthFilledCount: number;
  monthLitersDispensed: number;
  monthAmountDispensed: number;
  outstandingPayableAmount: number;
  totalSettledAmount: number;
}

export default function PumpDashboardPage() {
  const [pump, setPump] = useState<PumpSession | null>(null);
  const [accessCode, setAccessCode] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [approvalCode, setApprovalCode] = useState('');
  const [approvalDetails, setApprovalDetails] = useState<ApprovalDetails | null>(null);
  const [isFulfillModalOpen, setIsFulfillModalOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [filledQuantity, setFilledQuantity] = useState('');
  const [filledAmount, setFilledAmount] = useState('');
  const [pumpNotes, setPumpNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRow[]>([]);
  const [recentFills, setRecentFills] = useState<ApprovalRow[]>([]);
  const [summary, setSummary] = useState<ApprovalSummary | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDateTime = (value?: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const loadDashboard = async () => {
    setIsLoadingDashboard(true);
    try {
      const [sessionRes, approvalsRes] = await Promise.all([
        fetch('/api/pump/session'),
        fetch('/api/pump/approvals?limit=100'),
      ]);

      if (sessionRes.status === 401) {
        setPump(null);
        setPendingApprovals([]);
        setRecentFills([]);
        setSummary(null);
        return;
      }

      const sessionJson = await sessionRes.json();
      if (!sessionRes.ok || !sessionJson.authenticated) {
        throw new Error(sessionJson.error || 'Failed to load pump session');
      }

      const approvalsJson = await approvalsRes.json();
      if (!approvalsRes.ok || !approvalsJson.success) {
        throw new Error(approvalsJson.error || 'Failed to load pump approvals');
      }

      setPump(sessionJson.pump);
      setPendingApprovals(approvalsJson.pendingApprovals || []);
      setRecentFills((approvalsJson.recentFills || []).slice(0, 10));
      setSummary(approvalsJson.summary || null);
    } catch (error) {
      console.error('Failed to load pump dashboard:', error);
      setSessionError(error instanceof Error ? error.message : 'Failed to load dashboard');
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSessionError(null);
    setIsAuthenticating(true);

    try {
      const response = await fetch('/api/pump/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_code: accessCode }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to access dashboard');
      }

      setAccessCode('');
      await loadDashboard();
    } catch (error) {
      console.error('Pump dashboard login failed:', error);
      setSessionError(error instanceof Error ? error.message : 'Failed to access dashboard');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/pump/session', { method: 'DELETE' });
    setPump(null);
    setApprovalCode('');
    setApprovalDetails(null);
    setFilledQuantity('');
    setFilledAmount('');
    setPumpNotes('');
    setPendingApprovals([]);
    setRecentFills([]);
    setSummary(null);
  };

  const resetFulfillState = () => {
    setApprovalCode('');
    setApprovalDetails(null);
    setFilledQuantity('');
    setFilledAmount('');
    setPumpNotes('');
    setValidationError(null);
    setSubmitError(null);
  };

  const openFulfillModal = (code?: string) => {
    setIsFulfillModalOpen(true);
    setSubmitSuccess(null);
    setSubmitError(null);
    setValidationError(null);
    if (code) {
      void handleValidate(undefined, code);
    }
  };

  const closeFulfillModal = () => {
    setIsFulfillModalOpen(false);
    resetFulfillState();
  };

  const handleValidate = async (e?: React.FormEvent, codeOverride?: string) => {
    e?.preventDefault();
    setValidationError(null);
    setApprovalDetails(null);
    const code = (codeOverride || approvalCode).trim().toUpperCase();

    if (!code) {
      setValidationError('Please enter an approval code');
      return;
    }

    setApprovalCode(code);
    setIsValidating(true);

    try {
      const response = await fetch('/api/pump/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_code: code }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Validation failed');
      }
      if (!result.valid) {
        setValidationError(result.message || 'Invalid approval code');
        return;
      }

      setApprovalDetails(result.approval);
      setIsFulfillModalOpen(true);
      setFilledQuantity('');
      setFilledAmount('');
      setPumpNotes('');
    } catch (error) {
      console.error('Validation error:', error);
      setValidationError(error instanceof Error ? error.message : 'Failed to validate code');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmitFill = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!approvalDetails) {
      setSubmitError('Validate an approval code first');
      return;
    }
    if (!filledQuantity || parseFloat(filledQuantity) <= 0) {
      setSubmitError('Please enter valid filled quantity');
      return;
    }
    if (!filledAmount || parseFloat(filledAmount) <= 0) {
      setSubmitError('Please enter valid filled amount');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/pump/log-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approval_code: approvalCode.trim().toUpperCase(),
          filled_quantity: parseFloat(filledQuantity),
          filled_amount: parseFloat(filledAmount),
          pump_notes: pumpNotes.trim() || undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to log fill');
      }

      setSubmitSuccess(`Fuel fill logged for ${result.approval.approval_code}`);
      closeFulfillModal();
      await loadDashboard();
    } catch (error) {
      console.error('Submit error:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to log fill');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingDashboard) {
    return (
      <div className="min-h-screen bg-neutral-darkest flex items-center justify-center">
        <div className="text-secondary">Loading pump dashboard...</div>
      </div>
    );
  }

  if (!pump) {
    return (
      <div className="min-h-screen bg-neutral-darkest">
        <header className="bg-neutral-dark border-b border-neutral-medium">
          <div className="px-6 py-4">
            <h1 className="text-2xl font-bold text-primary">Finverno SME Fuel Dashboard</h1>
            <p className="text-secondary text-sm mt-1">
              Pump-scoped access for validating and fulfilling Finverno SME fuel approvals
            </p>
          </div>
        </header>

        <main className="p-6">
          <div className="max-w-md mx-auto bg-neutral-dark rounded-lg border border-neutral-medium p-6">
            <h2 className="text-lg font-semibold text-primary mb-4">Pump Access</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Dashboard Access Code
                </label>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="AB12CD"
                  className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary font-mono focus:outline-none focus:ring-2 focus:ring-accent-orange border-neutral-medium"
                />
              </div>
              {sessionError && (
                <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
                  {sessionError}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isAuthenticating || !accessCode.trim()}>
                {isAuthenticating ? 'Accessing...' : 'Access Pump Dashboard'}
              </Button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-darkest">
      <header className="bg-neutral-dark border-b border-neutral-medium">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">Finverno SME Fuel Dashboard</h1>
            <p className="text-secondary text-sm mt-1">
              {pump.pump_name}
              {pump.oem_name ? ` · ${pump.oem_name}` : ''}
              {pump.city || pump.state ? ` · ${[pump.city, pump.state].filter(Boolean).join(', ')}` : ''}
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {submitSuccess && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
            {submitSuccess}
          </div>
        )}

        <div className="grid md:grid-cols-5 gap-4">
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-4">
            <div className="text-xs uppercase text-secondary">Pending Approvals</div>
            <div className="text-3xl font-bold text-primary mt-2">{summary?.pendingCount ?? 0}</div>
          </div>
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-4">
            <div className="text-xs uppercase text-secondary">Today Fills</div>
            <div className="text-3xl font-bold text-primary mt-2">{summary?.todayFilledCount ?? 0}</div>
            <div className="text-xs text-secondary mt-1">{summary?.todayLitersDispensed ?? 0}L dispensed</div>
          </div>
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-4">
            <div className="text-xs uppercase text-secondary">Today Amount</div>
            <div className="text-3xl font-bold text-primary mt-2">
              {formatCurrency(summary?.todayAmountDispensed ?? 0)}
            </div>
          </div>
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-4">
            <div className="text-xs uppercase text-secondary">Month Amount</div>
            <div className="text-3xl font-bold text-primary mt-2">
              {formatCurrency(summary?.monthAmountDispensed ?? 0)}
            </div>
            <div className="text-xs text-secondary mt-1">{summary?.monthLitersDispensed ?? 0}L this month</div>
          </div>
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-4">
            <div className="text-xs uppercase text-secondary">Outstanding Payable</div>
            <div className="text-3xl font-bold text-primary mt-2">
              {formatCurrency(summary?.outstandingPayableAmount ?? 0)}
            </div>
            <div className="text-xs text-secondary mt-1">
              Settled so far {formatCurrency(summary?.totalSettledAmount ?? 0)}
            </div>
          </div>
        </div>

        <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-primary">Pending Approvals</h2>
              <p className="text-sm text-secondary">Open a request row to validate and log the actual fill.</p>
            </div>
            <Button variant="outline" onClick={() => openFulfillModal()}>
              Validate by Code
            </Button>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="text-secondary text-sm">No active approvals for this pump.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead className="text-left text-xs uppercase text-secondary border-b border-neutral-medium">
                  <tr>
                    <th className="py-3 pr-4">SME</th>
                    <th className="py-3 pr-4">Vehicle</th>
                    <th className="py-3 pr-4">Fuel Limit</th>
                    <th className="py-3 pr-4">Max Amount</th>
                    <th className="py-3 pr-4">Valid Till</th>
                    <th className="py-3 pr-4">Reference</th>
                    <th className="py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApprovals.map((approval) => (
                    <tr key={approval.id} className="border-b border-neutral-medium/70 hover:bg-neutral-darker/50">
                      <td className="py-4 pr-4">
                        <div className="text-primary font-medium">{approval.contractors?.company_name || 'SME'}</div>
                        {approval.contractors?.contact_person && (
                          <div className="text-xs text-secondary mt-1">
                            {approval.contractors.contact_person}
                            {approval.contractors?.phone ? ` · ${approval.contractors.phone}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-4 pr-4">
                        <div className="text-primary">{approval.vehicles?.vehicle_number || '—'}</div>
                        <div className="text-xs text-secondary mt-1">{approval.vehicles?.vehicle_type || 'Vehicle'}</div>
                      </td>
                      <td className="py-4 pr-4 text-primary">{approval.max_liters}L</td>
                      <td className="py-4 pr-4 text-primary">{formatCurrency(Number(approval.max_amount || 0))}</td>
                      <td className="py-4 pr-4 text-primary">{formatDateTime(approval.valid_until)}</td>
                      <td className="py-4 pr-4 font-mono text-sm text-secondary">{approval.approval_code}</td>
                      <td className="py-4 text-right">
                        <Button
                          size="sm"
                          onClick={() => openFulfillModal(approval.approval_code)}
                          disabled={isValidating}
                        >
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
          <h2 className="text-lg font-semibold text-primary mb-4">Recent Fills</h2>
          {recentFills.length === 0 ? (
            <div className="text-secondary text-sm">No recent fills for this pump.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="text-left text-xs uppercase text-secondary">
                  <tr>
                    <th className="py-2">Approval</th>
                    <th className="py-2">SME</th>
                    <th className="py-2">Vehicle</th>
                    <th className="py-2">Liters</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Filled At</th>
                  </tr>
                </thead>
                <tbody>
                  {recentFills.map((fill) => (
                    <tr key={fill.id} className="border-t border-neutral-medium">
                      <td className="py-3 font-mono text-sm text-primary">{fill.approval_code}</td>
                      <td className="py-3 text-sm text-primary">{fill.contractors?.company_name || 'SME'}</td>
                      <td className="py-3 text-sm text-secondary">{fill.vehicles?.vehicle_number || '—'}</td>
                      <td className="py-3 text-sm text-secondary">{Number(fill.filled_quantity || 0).toFixed(2)}L</td>
                      <td className="py-3 text-sm text-secondary">{formatCurrency(Number(fill.filled_amount || 0))}</td>
                      <td className="py-3 text-sm text-secondary">{formatDateTime(fill.filled_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {isFulfillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-neutral-medium bg-neutral-dark shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-neutral-medium px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-primary">Validate & Fulfill</h2>
                <p className="text-sm text-secondary">Open an approval and log the actual liters and amount dispensed.</p>
              </div>
              <Button variant="outline" size="sm" onClick={closeFulfillModal}>
                Close
              </Button>
            </div>

            <div className="p-6 space-y-6">
              <form onSubmit={handleValidate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Approval Code</label>
                  <input
                    type="text"
                    value={approvalCode}
                    onChange={(e) => setApprovalCode(e.target.value.toUpperCase())}
                    placeholder="FA-260320-0001"
                    className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary font-mono focus:outline-none focus:ring-2 focus:ring-accent-orange border-neutral-medium"
                  />
                </div>
                {validationError && <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">{validationError}</div>}
                <Button type="submit" disabled={isValidating || !approvalCode.trim()}>
                  {isValidating ? 'Validating...' : 'Validate Code'}
                </Button>
              </form>

              {approvalDetails && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="text-sm font-semibold text-green-400 mb-2">Valid Approval</div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-secondary">SME:</span> <span className="text-primary">{approvalDetails.contractor_name}</span></div>
                      <div><span className="text-secondary">Vehicle:</span> <span className="text-primary">{approvalDetails.vehicle_number}</span></div>
                      <div><span className="text-secondary">Max Liters:</span> <span className="text-primary">{approvalDetails.max_liters}L</span></div>
                      <div><span className="text-secondary">Max Amount:</span> <span className="text-primary">{formatCurrency(approvalDetails.max_amount)}</span></div>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitFill} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Filled Quantity (Liters)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={approvalDetails.max_liters}
                        value={filledQuantity}
                        onChange={(e) => setFilledQuantity(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange border-neutral-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Filled Amount (Rs)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={approvalDetails.max_amount}
                        value={filledAmount}
                        onChange={(e) => setFilledAmount(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange border-neutral-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Pump Notes</label>
                      <textarea
                        rows={3}
                        value={pumpNotes}
                        onChange={(e) => setPumpNotes(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange border-neutral-medium"
                        placeholder="Optional notes for this fulfillment"
                      />
                    </div>
                    {submitError && <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">{submitError}</div>}
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Logging Fill...' : 'Log Fuel Fill'}
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
