'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components';

type Allocation = {
  modelType: 'fixed_debt' | 'pool_participation';
  amount: number;
};

type AllocationIntent = {
  id: string;
  status:
    | 'draft'
    | 'agreements_pending'
    | 'ready_for_funding'
    | 'funding_submitted'
    | 'completed'
    | 'cancelled'
    | 'superseded';
  total_amount: number;
  allocation_payload: Allocation[];
  agreements_ready_at?: string | null;
  funding_submitted_at?: string | null;
  created_at: string;
};

type PaymentSubmission = {
  id: string;
  amount: number;
  allocation_intent_id?: string | null;
  allocation_payload?: Allocation[] | null;
  payment_date: string;
  payment_method: string;
  payment_reference?: string | null;
  notes?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  review_notes?: string | null;
  created_at: string;
  proof_signed_url?: string | null;
};

type FinvernoBankDetails = {
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  account_type: string;
  upi_id: string;
};

interface AddCapitalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_LABELS: Record<AllocationIntent['status'], string> = {
  draft: 'Draft',
  agreements_pending: 'Agreement Required',
  ready_for_funding: 'Ready For Funding',
  funding_submitted: 'Funding Submitted',
  completed: 'Completed',
  cancelled: 'Cancelled',
  superseded: 'Superseded',
};

export function AddCapitalModal({ isOpen, onClose }: AddCapitalModalProps) {
  const [finvernoBankDetails, setFinvernoBankDetails] = useState<FinvernoBankDetails>({
    account_holder_name: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    account_type: '',
    upi_id: '',
  });
  const [paymentSubmissions, setPaymentSubmissions] = useState<PaymentSubmission[]>([]);
  const [allocationIntents, setAllocationIntents] = useState<AllocationIntent[]>([]);
  const [paymentForm, setPaymentForm] = useState({
    allocationIntentId: '',
    paymentDate: '',
    paymentMethod: 'bank_transfer',
    paymentReference: '',
    notes: '',
  });
  const [submissionProofFile, setSubmissionProofFile] = useState<File | null>(null);
  const [submissionProofName, setSubmissionProofName] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentSubmissionMessage, setPaymentSubmissionMessage] = useState<string | null>(null);

  const readyIntents = useMemo(
    () => allocationIntents.filter((intent) => intent.status === 'ready_for_funding'),
    [allocationIntents]
  );
  const selectedReadyIntent = readyIntents.find((intent) => intent.id === paymentForm.allocationIntentId) || null;

  useEffect(() => {
    if (!isOpen) return;
    fetchFinvernoBankDetails();
    fetchPaymentSubmissions();
    fetchAllocationIntents();
  }, [isOpen]);

  useEffect(() => {
    if (!readyIntents.length) {
      setPaymentForm((prev) => ({ ...prev, allocationIntentId: '' }));
      return;
    }

    setPaymentForm((prev) => ({
      ...prev,
      allocationIntentId: prev.allocationIntentId || readyIntents[0]?.id || '',
    }));
  }, [readyIntents]);

  const fetchFinvernoBankDetails = async () => {
    try {
      const response = await fetch('/api/investor/finverno-bank-details');
      const result = await response.json();
      if (response.ok && result?.success) {
        setFinvernoBankDetails(result.details);
      }
    } catch (error) {
      console.error('Failed to fetch Finverno bank details:', error);
    }
  };

  const fetchPaymentSubmissions = async () => {
    try {
      const response = await fetch('/api/investor/payment-submissions');
      const result = await response.json();
      if (response.ok && result?.success) {
        setPaymentSubmissions(result.submissions || []);
      }
    } catch (error) {
      console.error('Failed to fetch payment submissions:', error);
    }
  };

  const fetchAllocationIntents = async () => {
    try {
      const response = await fetch('/api/investor/allocation-intents');
      const result = await response.json();
      if (response.ok && result?.success) {
        setAllocationIntents(result.intents || []);
      }
    } catch (error) {
      console.error('Failed to fetch allocation intents:', error);
    }
  };

  const handleSubmitPaymentConfirmation = async () => {
    setSubmittingPayment(true);
    setPaymentSubmissionMessage(null);

    try {
      if (!paymentForm.allocationIntentId) {
        throw new Error('Select a ready allocation before submitting payment');
      }
      if (!paymentForm.paymentDate) {
        throw new Error('Please select payment date');
      }

      const formData = new FormData();
      formData.append('allocation_intent_id', paymentForm.allocationIntentId);
      formData.append('payment_date', paymentForm.paymentDate);
      formData.append('payment_method', paymentForm.paymentMethod);
      formData.append('payment_reference', paymentForm.paymentReference);
      formData.append('notes', paymentForm.notes);
      if (submissionProofFile) {
        formData.append('proof_file', submissionProofFile);
      }

      const response = await fetch('/api/investor/payment-submissions', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to submit payment confirmation');
      }

      setPaymentSubmissionMessage('Payment confirmation submitted. Admin will review and approve.');
      setPaymentForm({
        allocationIntentId: '',
        paymentDate: '',
        paymentMethod: 'bank_transfer',
        paymentReference: '',
        notes: '',
      });
      setSubmissionProofFile(null);
      setSubmissionProofName('');

      await Promise.all([fetchAllocationIntents(), fetchPaymentSubmissions()]);
    } catch (error) {
      console.error('Failed to submit payment confirmation:', error);
      setPaymentSubmissionMessage(
        error instanceof Error ? error.message : 'Failed to submit payment confirmation'
      );
    } finally {
      setSubmittingPayment(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'approved':
      case 'ready_for_funding':
        return 'bg-green-500/10 text-green-500';
      case 'pending':
      case 'funding_submitted':
      case 'agreements_pending':
        return 'bg-amber-500/10 text-amber-500';
      case 'failed':
      case 'rejected':
      case 'superseded':
      case 'cancelled':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-neutral-medium text-secondary';
    }
  };

  const renderAllocationSummary = (allocationPayload?: Allocation[] | null) =>
    (allocationPayload || [])
      .map((allocation) =>
        `${allocation.modelType === 'fixed_debt' ? 'Fixed Debt' : 'Pool Participation'}: ${formatCurrency(Number(allocation.amount || 0))}`
      )
      .join(' · ');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-lg border border-neutral-medium bg-neutral-dark"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-neutral-medium bg-neutral-dark p-6">
          <div>
            <h2 className="text-xl font-semibold text-primary">Funding Instructions & Submission</h2>
            <p className="mt-1 text-sm text-secondary">
              Finverno prepares your allocation and sends the required agreements first. Once those agreements are executed, you can submit your transfer details here.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-secondary transition-colors hover:text-primary"
            aria-label="Close modal"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-neutral-medium bg-neutral-darker/40 p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">Current Proposal</h3>
              {allocationIntents.length === 0 ? (
                <p className="text-sm text-secondary">
                  Your allocation is being prepared by the Finverno team. Once the proposal is ready, you will see the current split and the next action here.
                </p>
              ) : (
                <div className="space-y-3">
                  {allocationIntents.map((intent) => (
                    <div key={intent.id} className="rounded-lg border border-neutral-medium p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="font-medium text-primary">{formatCurrency(Number(intent.total_amount || 0))}</div>
                          <div className="text-xs text-secondary">{renderAllocationSummary(intent.allocation_payload)}</div>
                          <div className="mt-1 text-xs text-secondary">
                            Proposed {formatDate(intent.created_at)}
                            {intent.agreements_ready_at ? ` · Ready ${formatDate(intent.agreements_ready_at)}` : ''}
                          </div>
                        </div>
                        <span className={`inline-flex items-center rounded px-2 py-1 text-xs ${getStatusColor(intent.status)}`}>
                          {STATUS_LABELS[intent.status] || intent.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-neutral-medium bg-neutral-darker/40 p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">Submit Capital</h3>
              <div className="mb-4 space-y-1 text-sm text-secondary">
                <p><span className="text-primary">Account Holder:</span> {finvernoBankDetails.account_holder_name || '—'}</p>
                <p><span className="text-primary">Bank:</span> {finvernoBankDetails.bank_name || '—'}</p>
                <p><span className="text-primary">A/C Number:</span> {finvernoBankDetails.account_number || '—'}</p>
                <p><span className="text-primary">A/C Type:</span> {finvernoBankDetails.account_type || '—'}</p>
                <p><span className="text-primary">IFSC:</span> {finvernoBankDetails.ifsc_code || '—'}</p>
                <p><span className="text-primary">UPI:</span> {finvernoBankDetails.upi_id || '—'}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs uppercase tracking-wide text-secondary">Ready Allocation</label>
                  <select
                    value={paymentForm.allocationIntentId}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, allocationIntentId: e.target.value }))}
                    className="mt-2 w-full rounded-lg border border-neutral-medium bg-neutral-darker px-3 py-2 text-sm text-primary"
                  >
                    <option value="">Select a ready allocation</option>
                    {readyIntents.map((intent) => (
                      <option key={intent.id} value={intent.id}>
                        {formatCurrency(Number(intent.total_amount || 0))} · {renderAllocationSummary(intent.allocation_payload)}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedReadyIntent && (
                  <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-sm text-secondary">
                    <div className="font-medium text-primary">{formatCurrency(Number(selectedReadyIntent.total_amount || 0))}</div>
                    <div className="mt-1">{renderAllocationSummary(selectedReadyIntent.allocation_payload)}</div>
                    <div className="mt-1">Agreements ready on {formatDate(selectedReadyIntent.agreements_ready_at || selectedReadyIntent.created_at)}</div>
                  </div>
                )}

                <div>
                  <label className="text-xs uppercase tracking-wide text-secondary">Payment Date</label>
                  <input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, paymentDate: e.target.value }))}
                    className="mt-2 w-full rounded-lg border border-neutral-medium bg-neutral-darker px-3 py-2 text-sm text-primary"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-secondary">Payment Reference (UTR / Txn ID)</label>
                  <input
                    type="text"
                    value={paymentForm.paymentReference}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, paymentReference: e.target.value }))}
                    className="mt-2 w-full rounded-lg border border-neutral-medium bg-neutral-darker px-3 py-2 text-sm text-primary"
                    placeholder="Enter UTR or transaction ID"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-secondary">Proof of Transfer (Optional)</label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setSubmissionProofFile(file);
                      setSubmissionProofName(file?.name || '');
                    }}
                    className="mt-2 text-xs text-secondary"
                  />
                  {submissionProofName && <p className="mt-1 text-xs text-secondary">Selected: {submissionProofName}</p>}
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-secondary">Notes (Optional)</label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="mt-2 w-full rounded-lg border border-neutral-medium bg-neutral-darker px-3 py-2 text-sm text-primary"
                    placeholder="Any context for admin review"
                  />
                </div>
                <Button size="sm" disabled={submittingPayment || !readyIntents.length} onClick={handleSubmitPaymentConfirmation}>
                  {submittingPayment ? 'Submitting...' : 'Submit Capital'}
                </Button>
                {!readyIntents.length && (
                  <p className="text-xs text-secondary">
                    No proposal is ready for funding yet. Finverno will unlock this step once the relevant agreements are executed.
                  </p>
                )}
                {paymentSubmissionMessage && <p className="text-xs text-secondary">{paymentSubmissionMessage}</p>}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-neutral-medium bg-neutral-dark">
            <div className="flex items-center justify-between border-b border-neutral-medium p-6">
              <div>
                <h3 className="text-xl font-semibold text-primary">Proposal History</h3>
                <p className="text-sm text-secondary">These are the allocations Finverno has prepared for your review across pool participation and fixed debt sleeves.</p>
              </div>
              <div className="text-sm text-secondary">{allocationIntents.length} intents</div>
            </div>
            <div className="space-y-3 p-6">
              {allocationIntents.length === 0 && <div className="text-sm text-secondary">No proposals yet.</div>}
              {allocationIntents.map((intent) => (
                <div key={intent.id} className="rounded-lg border border-neutral-medium p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-primary font-medium">{formatCurrency(Number(intent.total_amount || 0))}</div>
                      <div className="text-xs text-secondary">{renderAllocationSummary(intent.allocation_payload)}</div>
                      <div className="mt-1 text-xs text-secondary">Created {formatDate(intent.created_at)}</div>
                    </div>
                    <span className={`inline-flex items-center rounded px-2 py-1 text-xs ${getStatusColor(intent.status)}`}>
                      {STATUS_LABELS[intent.status] || intent.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">Payment Submission Status</h3>
            <div className="space-y-3">
              {paymentSubmissions.length === 0 && <div className="text-sm text-secondary">No payment submissions yet.</div>}
              {paymentSubmissions.map((submission) => (
                <div key={submission.id} className="flex flex-col gap-3 rounded-lg border border-neutral-medium p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-medium text-primary">{formatCurrency(Number(submission.amount || 0))}</div>
                    <div className="text-xs text-secondary">
                      {submission.payment_reference ? `Ref: ${submission.payment_reference} · ` : ''}
                      Submitted {formatDate(submission.created_at)}
                    </div>
                    <div className="text-xs text-secondary">Paid on {formatDate(submission.payment_date)}</div>
                    {!!submission.allocation_payload?.length && (
                      <div className="mt-1 text-xs text-secondary">{renderAllocationSummary(submission.allocation_payload)}</div>
                    )}
                    {submission.proof_signed_url && (
                      <a
                        href={submission.proof_signed_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-accent-amber hover:underline"
                      >
                        View Proof
                      </a>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center rounded px-2 py-1 text-xs ${getStatusColor(submission.status === 'approved' ? 'completed' : submission.status)}`}>
                      {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                    </span>
                    {submission.review_notes && <div className="mt-1 text-xs text-secondary">{submission.review_notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
