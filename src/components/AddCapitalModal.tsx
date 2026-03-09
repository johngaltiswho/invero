'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components';

type PaymentSubmission = {
  id: string;
  amount: number;
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

export function AddCapitalModal({ isOpen, onClose }: AddCapitalModalProps) {
  const [finvernoBankDetails, setFinvernoBankDetails] = useState<FinvernoBankDetails>({
    account_holder_name: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    account_type: '',
    upi_id: ''
  });
  const [paymentSubmissions, setPaymentSubmissions] = useState<PaymentSubmission[]>([]);
  const [submissionForm, setSubmissionForm] = useState({
    amount: '',
    paymentDate: '',
    paymentMethod: 'bank_transfer',
    paymentReference: '',
    notes: ''
  });
  const [submissionProofFile, setSubmissionProofFile] = useState<File | null>(null);
  const [submissionProofName, setSubmissionProofName] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentSubmissionMessage, setPaymentSubmissionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchFinvernoBankDetails();
      fetchPaymentSubmissions();
    }
  }, [isOpen]);

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

  const handleSubmitPaymentConfirmation = async () => {
    setSubmittingPayment(true);
    setPaymentSubmissionMessage(null);

    try {
      const amount = Number(submissionForm.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Enter a valid payment amount');
      }
      if (!submissionForm.paymentDate) {
        throw new Error('Please select payment date');
      }

      const formData = new FormData();
      formData.append('amount', String(amount));
      formData.append('payment_date', submissionForm.paymentDate);
      formData.append('payment_method', submissionForm.paymentMethod);
      formData.append('payment_reference', submissionForm.paymentReference);
      formData.append('notes', submissionForm.notes);
      if (submissionProofFile) {
        formData.append('proof_file', submissionProofFile);
      }

      const response = await fetch('/api/investor/payment-submissions', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to submit payment confirmation');
      }

      setPaymentSubmissionMessage('Payment confirmation submitted. Admin will review and approve.');
      setSubmissionForm({
        amount: '',
        paymentDate: '',
        paymentMethod: 'bank_transfer',
        paymentReference: '',
        notes: ''
      });
      setSubmissionProofFile(null);
      setSubmissionProofName('');

      await fetchPaymentSubmissions();
    } catch (error) {
      console.error('Failed to submit payment confirmation:', error);
      setPaymentSubmissionMessage(
        error instanceof Error ? error.message : 'Failed to submit payment confirmation'
      );
    } finally {
      setSubmittingPayment(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'approved':
        return 'bg-green-500/10 text-green-500';
      case 'pending':
        return 'bg-amber-500/10 text-amber-500';
      case 'failed':
      case 'rejected':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-neutral-medium text-secondary';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="bg-neutral-dark rounded-lg border border-neutral-medium w-full max-w-5xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-neutral-dark border-b border-neutral-medium p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primary">Add Capital to Finverno</h2>
            <p className="text-secondary text-sm mt-1">
              Transfer funds to the account below, then submit payment confirmation for admin approval.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-secondary hover:text-primary transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="rounded-lg border border-neutral-medium bg-neutral-darker/40 p-4">
              <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wide">Finverno Receiving Account</h3>
              <div className="space-y-1 text-sm text-secondary mb-4">
                <p><span className="text-primary">Account Holder:</span> {finvernoBankDetails.account_holder_name || '—'}</p>
                <p><span className="text-primary">Bank:</span> {finvernoBankDetails.bank_name || '—'}</p>
                <p><span className="text-primary">A/C Number:</span> {finvernoBankDetails.account_number || '—'}</p>
                <p><span className="text-primary">A/C Type:</span> {finvernoBankDetails.account_type || '—'}</p>
                <p><span className="text-primary">IFSC:</span> {finvernoBankDetails.ifsc_code || '—'}</p>
                <p><span className="text-primary">UPI:</span> {finvernoBankDetails.upi_id || '—'}</p>
              </div>

              {finvernoBankDetails.upi_id && (
                <div className="border-t border-neutral-medium pt-4 mt-4">
                  <p className="text-xs text-secondary mb-3 text-center">Scan QR code to pay via UPI</p>
                  <div className="flex justify-center">
                    <div className="bg-white p-3 rounded-lg">
                      <img
                        src="/images/finverno-upi-qr.png"
                        alt="UPI QR Code"
                        className="w-48 h-48"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-neutral-medium bg-neutral-darker/40 p-4">
              <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wide">Submit Payment Confirmation</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs uppercase tracking-wide text-secondary">Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={submissionForm.amount}
                    onChange={(e) => setSubmissionForm((prev) => ({ ...prev, amount: e.target.value }))}
                    className="mt-2 w-full rounded-lg border border-neutral-medium bg-neutral-darker px-3 py-2 text-sm text-primary"
                    placeholder="Enter transferred amount"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-secondary">Payment Date</label>
                  <input
                    type="date"
                    value={submissionForm.paymentDate}
                    onChange={(e) => setSubmissionForm((prev) => ({ ...prev, paymentDate: e.target.value }))}
                    className="mt-2 w-full rounded-lg border border-neutral-medium bg-neutral-darker px-3 py-2 text-sm text-primary"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-secondary">Payment Reference (UTR / Txn ID)</label>
                  <input
                    type="text"
                    value={submissionForm.paymentReference}
                    onChange={(e) => setSubmissionForm((prev) => ({ ...prev, paymentReference: e.target.value }))}
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
                  {submissionProofName && (
                    <p className="text-xs text-secondary mt-1">Selected: {submissionProofName}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-secondary">Notes (Optional)</label>
                  <textarea
                    value={submissionForm.notes}
                    onChange={(e) => setSubmissionForm((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="mt-2 w-full rounded-lg border border-neutral-medium bg-neutral-darker px-3 py-2 text-sm text-primary"
                    placeholder="Any context for admin review"
                  />
                </div>
                <Button size="sm" disabled={submittingPayment} onClick={handleSubmitPaymentConfirmation}>
                  {submittingPayment ? 'Submitting...' : 'Submit Confirmation'}
                </Button>
                {paymentSubmissionMessage && (
                  <p className="text-xs text-secondary">{paymentSubmissionMessage}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wide">Submission Status</h3>
            <div className="space-y-3">
              {paymentSubmissions.length === 0 && (
                <div className="text-secondary text-sm">No payment submissions yet.</div>
              )}
              {paymentSubmissions.map((submission) => (
                <div key={submission.id} className="border border-neutral-medium rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="text-primary font-medium">{formatCurrency(Number(submission.amount || 0))}</div>
                    <div className="text-xs text-secondary">
                      {submission.payment_reference ? `Ref: ${submission.payment_reference} · ` : ''}
                      Submitted {formatDate(submission.created_at)}
                    </div>
                    <div className="text-xs text-secondary">Paid on {formatDate(submission.payment_date)}</div>
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
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${getStatusColor(
                      submission.status === 'approved'
                        ? 'Completed'
                        : submission.status === 'rejected'
                          ? 'Failed'
                          : 'Pending'
                    )}`}>
                      {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                    </span>
                    {submission.review_notes && (
                      <div className="text-xs text-secondary mt-1">{submission.review_notes}</div>
                    )}
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
