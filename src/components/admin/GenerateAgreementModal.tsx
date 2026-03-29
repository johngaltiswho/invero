'use client';

import React from 'react';
import { Button } from '@/components';

export type AgreementDraftFormValues = {
  commitment_amount: string;
  agreement_date: string;
  investor_pan: string;
  investor_address: string;
  company_signatory_name: string;
  company_signatory_title: string;
  notes: string;
};

type Props = {
  isOpen: boolean;
  mode: 'create' | 'edit';
  values: AgreementDraftFormValues;
  processing: boolean;
  onClose: () => void;
  onChange: (field: keyof AgreementDraftFormValues, value: string) => void;
  onSubmit: () => void;
};

export default function GenerateAgreementModal({
  isOpen,
  mode,
  values,
  processing,
  onClose,
  onChange,
  onSubmit,
}: Props): React.ReactElement | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-lg border border-neutral-medium bg-neutral-dark"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-medium p-6">
          <div>
            <h3 className="text-lg font-semibold text-primary">
              {mode === 'create' ? 'Create Investor Agreement' : 'Update Draft Agreement'}
            </h3>
            <p className="text-sm text-secondary">
              {mode === 'create'
                ? 'Capture the commercial terms before creating the agreement record.'
                : 'Only draft and generated agreements can be updated before issue.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-secondary transition hover:text-primary"
            aria-label="Close agreement modal"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-primary">Commitment Amount (INR)</label>
              <input
                type="number"
                value={values.commitment_amount}
                onChange={(event) => onChange('commitment_amount', event.target.value)}
                className="w-full rounded-md border border-neutral-medium bg-neutral-darker px-3 py-2 text-primary"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-primary">Agreement Date</label>
              <input
                type="date"
                value={values.agreement_date}
                onChange={(event) => onChange('agreement_date', event.target.value)}
                style={{ colorScheme: 'dark' }}
                className="w-full rounded-md border border-neutral-medium bg-neutral-darker px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-primary">Investor PAN</label>
              <input
                type="text"
                value={values.investor_pan}
                onChange={(event) => onChange('investor_pan', event.target.value.toUpperCase())}
                className="w-full rounded-md border border-neutral-medium bg-neutral-darker px-3 py-2 text-primary"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-primary">Company Signatory Name</label>
              <input
                type="text"
                value={values.company_signatory_name}
                onChange={(event) => onChange('company_signatory_name', event.target.value)}
                className="w-full rounded-md border border-neutral-medium bg-neutral-darker px-3 py-2 text-primary"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-primary">Company Signatory Title</label>
              <input
                type="text"
                value={values.company_signatory_title}
                onChange={(event) => onChange('company_signatory_title', event.target.value)}
                className="w-full rounded-md border border-neutral-medium bg-neutral-darker px-3 py-2 text-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-primary">Investor Address</label>
            <textarea
              rows={3}
              value={values.investor_address}
              onChange={(event) => onChange('investor_address', event.target.value)}
              className="w-full rounded-md border border-neutral-medium bg-neutral-darker px-3 py-2 text-primary"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-primary">Notes</label>
            <textarea
              rows={4}
              value={values.notes}
              onChange={(event) => onChange('notes', event.target.value)}
              className="w-full rounded-md border border-neutral-medium bg-neutral-darker px-3 py-2 text-primary"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-neutral-medium p-6">
          <Button type="button" variant="secondary" onClick={onClose} disabled={processing}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={processing}>
            {processing ? (mode === 'create' ? 'Creating...' : 'Saving...') : mode === 'create' ? 'Create Agreement' : 'Save Draft'}
          </Button>
        </div>
      </div>
    </div>
  );
}
