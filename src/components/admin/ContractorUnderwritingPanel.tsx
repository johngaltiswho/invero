'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components';
import {
  DEFAULT_LATE_DEFAULT_TERMS,
  DEFAULT_PAYMENT_WINDOW_DAYS,
  DEFAULT_REPAYMENT_BASIS,
} from '@/lib/contractor-onboarding';

type Underwriting = {
  status: 'commercial_review' | 'commercial_approved' | 'commercial_rejected' | null;
  financing_limit: number | null;
  repayment_basis: 'client_payment_to_escrow' | null;
  payment_window_days: number | null;
  late_default_terms: string | null;
  notes: string | null;
};

type Props = {
  contractorId: string;
  onUpdated?: () => Promise<void> | void;
};

export default function ContractorUnderwritingPanel({ contractorId, onUpdated }: Props): React.ReactElement {
  const makeDefaultForm = () => ({
    status: 'commercial_review',
    financing_limit: '',
    repayment_basis: DEFAULT_REPAYMENT_BASIS,
    payment_window_days: String(DEFAULT_PAYMENT_WINDOW_DAYS),
    late_default_terms: DEFAULT_LATE_DEFAULT_TERMS,
    notes: '',
  });
  const [form, setForm] = useState(makeDefaultForm);
  const [savedForm, setSavedForm] = useState(makeDefaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/contractor-underwriting?contractor_id=${contractorId}`);
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to load underwriting');
        }
        const underwriting = (result.underwriting || {}) as Underwriting;
        if (!active) return;
        const nextForm = {
          status: underwriting.status || 'commercial_review',
          financing_limit: underwriting.financing_limit ? String(underwriting.financing_limit) : '',
          repayment_basis: underwriting.repayment_basis || DEFAULT_REPAYMENT_BASIS,
          payment_window_days: underwriting.payment_window_days ? String(underwriting.payment_window_days) : String(DEFAULT_PAYMENT_WINDOW_DAYS),
          late_default_terms: underwriting.late_default_terms || DEFAULT_LATE_DEFAULT_TERMS,
          notes: underwriting.notes || '',
        };
        setForm(nextForm);
        setSavedForm(nextForm);
        setIsEditing(false);
      } catch (error) {
        console.error('Failed to load contractor underwriting:', error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [contractorId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/contractor-underwriting', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractor_id: contractorId,
          status: form.status,
          financing_limit: form.financing_limit ? Number(form.financing_limit) : null,
          repayment_basis: DEFAULT_REPAYMENT_BASIS,
          payment_window_days: form.payment_window_days ? Number(form.payment_window_days) : null,
          late_default_terms: form.late_default_terms || DEFAULT_LATE_DEFAULT_TERMS,
          notes: form.notes || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save underwriting');
      }
      setSavedForm(form);
      setIsEditing(false);
      await onUpdated?.();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save underwriting');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-neutral-darker/60 border border-neutral-medium rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-primary">Commercial Review</h3>
          <p className="text-xs text-secondary">Define financing eligibility, limit, and repayment terms before enabling SME funding access.</p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setForm(savedForm);
                setIsEditing(false);
              }}
              disabled={saving || loading}
            >
              Cancel
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={isEditing ? handleSave : () => setIsEditing(true)}
            disabled={saving || loading}
          >
            {saving ? 'Saving...' : isEditing ? 'Save Commercial Terms' : 'Edit Commercial Terms'}
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <label className="block">
          <span className="text-secondary">Commercial Status</span>
          <select
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
            disabled={!isEditing || loading}
            className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary"
          >
            <option value="commercial_review">Commercial Review</option>
            <option value="commercial_approved">Commercial Approved</option>
            <option value="commercial_rejected">Commercial Rejected</option>
          </select>
        </label>

        <label className="block">
          <span className="text-secondary">Financing Limit (INR)</span>
          <input
            type="number"
            value={form.financing_limit}
            onChange={(event) => setForm((prev) => ({ ...prev, financing_limit: event.target.value }))}
            disabled={!isEditing || loading}
            className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary"
          />
        </label>

        <label className="block">
          <span className="text-secondary">Repayment Basis</span>
          <input
            type="text"
            value="Client Payment To Escrow"
            disabled
            className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary opacity-80"
          />
          <p className="mt-1 text-xs text-secondary">
            Standard Finverno basis for MVP financing.
          </p>
        </label>

        <label className="block">
          <span className="text-secondary">Payment Window (Days)</span>
          <input
            type="number"
            value={form.payment_window_days}
            onChange={(event) => setForm((prev) => ({ ...prev, payment_window_days: event.target.value }))}
            disabled={!isEditing || loading}
            className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary"
          />
        </label>
      </div>

      <div className="grid gap-4 mt-4 text-sm">
        <label className="block">
          <span className="text-secondary">Late / Default Terms</span>
          <textarea
            rows={3}
            value={form.late_default_terms}
            onChange={(event) => setForm((prev) => ({ ...prev, late_default_terms: event.target.value }))}
            disabled={!isEditing || loading}
            className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary"
          />
        </label>

        <label className="block">
          <span className="text-secondary">Review Notes</span>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            disabled={!isEditing || loading}
            className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary"
          />
        </label>
      </div>
    </div>
  );
}
