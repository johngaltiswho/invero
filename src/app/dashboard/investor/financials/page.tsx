'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components';
import { useInvestor } from '@/contexts/InvestorContext';

type InvestorTransaction = {
  id: string;
  transaction_type?: string;
  amount?: number | string;
  status?: string;
  reference_number?: string;
  description?: string;
  created_at?: string;
  projects?: {
    project_name?: string;
  } | null;
};

type InvestorDocument = {
  name: string;
  documentType?: string;
  signedUrl?: string | null;
  createdAt?: string | null;
};

export default function FinancialManagement(): React.ReactElement {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'transactions' | 'payouts' | 'tax'>('overview');
  const [bankForm, setBankForm] = useState({
    accountHolder: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: ''
  });
  const [chequeFileName, setChequeFileName] = useState('');
  const [chequeFile, setChequeFile] = useState<File | null>(null);
  const [bankSaving, setBankSaving] = useState(false);
  const [bankMessage, setBankMessage] = useState<string | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [panFileName, setPanFileName] = useState('');
  const [panUploading, setPanUploading] = useState(false);
  const [panMessage, setPanMessage] = useState<string | null>(null);
  const [panDocument, setPanDocument] = useState<{ name: string; signedUrl: string | null; createdAt: string | null } | null>(null);
  const [finvernoBankDetails, setFinvernoBankDetails] = useState({
    account_holder_name: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    account_type: '',
    branch_name: '',
    upi_id: ''
  });
  const [paymentSubmissions, setPaymentSubmissions] = useState<Array<{
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
  }>>([]);
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
  const { investor } = useInvestor();
  const portfolioMetrics = investor?.portfolioMetrics || {
    totalInvested: 0,
    totalReturns: 0,
    currentValue: 0,
    roi: 0,
    netRoi: 0,
    activeInvestments: 0,
    completedInvestments: 0,
    totalInvestments: 0,
    capitalInflow: 0,
    capitalReturns: 0,
    netCapitalReturns: 0,
    managementFees: 0,
    performanceFees: 0
  };

  const transactions = useMemo(() => {
    const allTx = (investor?.transactions || []) as InvestorTransaction[];
    return allTx.map((tx) => {
      const type = String(tx.transaction_type || '').toLowerCase();
      const projectName = tx.projects?.project_name || 'Project';
      const amount = Number(tx.amount) || 0;
      const isOutflow = type === 'deployment' || type === 'withdrawal';
      const rawStatus = tx.status ? String(tx.status) : 'completed';
      const prettyStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
      return {
        id: tx.id,
        date: tx.created_at,
        type: type ? type[0].toUpperCase() + type.slice(1) : 'Transaction',
        projectName,
        amount: isOutflow ? -Math.abs(amount) : Math.abs(amount),
        status: prettyStatus,
        reference: tx.reference_number || '',
        description: tx.description || ''
      };
    });
  }, [investor?.transactions]);

  const completedReturns = useMemo(() => {
    return transactions.filter(
      (tx) => String(tx.type).toLowerCase() === 'return' && String(tx.status).toLowerCase() === 'completed'
    );
  }, [transactions]);

  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount);
    return `${amount < 0 ? '-' : ''}₹${absAmount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTransactionColor = (type: string, amount: number) => {
    if (amount < 0) return 'text-warning'; // Outgoing
    if (type.toLowerCase() === 'return' || type.toLowerCase() === 'inflow') {
      return 'text-success';
    }
    return 'text-primary';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-success/10 text-success';
      case 'Pending': return 'bg-warning/10 text-warning';
      case 'Failed': return 'bg-error/10 text-error';
      default: return 'bg-neutral-medium text-secondary';
    }
  };

  const handleBankFieldChange = (field: keyof typeof bankForm, value: string) => {
    setBankForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const loadBankDetails = async () => {
      try {
        const response = await fetch('/api/investor/bank-details');
        const result = await response.json();
        if (response.ok && result?.success && result?.data) {
          setBankForm({
            accountHolder: result.data.bank_account_holder || '',
            bankName: result.data.bank_name || '',
            accountNumber: result.data.bank_account_number || '',
            ifscCode: result.data.bank_ifsc || '',
            branchName: result.data.bank_branch || ''
          });
          if (result.data.cancelled_cheque_path) {
            setChequeFileName('cancelled-cheque');
          }
        }
      } catch (error) {
        console.warn('Failed to load bank details', error);
      }
    };

    const loadPanDocument = async () => {
      try {
        const response = await fetch('/api/investor/documents');
        const result = await response.json();
        if (response.ok && result?.success) {
          const panDoc = (result.documents || [] as InvestorDocument[]).find((doc) => doc.documentType === 'pan');
          if (panDoc) {
            setPanDocument({
              name: panDoc.name,
              signedUrl: panDoc.signedUrl || null,
              createdAt: panDoc.createdAt || null
            });
          } else {
            setPanDocument(null);
          }
        }
      } catch (error) {
        console.warn('Failed to load PAN document', error);
      }
    };

    const loadFinvernoBankDetails = async () => {
      try {
        const response = await fetch('/api/investor/finverno-bank-details');
        const result = await response.json();
        if (response.ok && result?.success && result?.details) {
          setFinvernoBankDetails({
            account_holder_name: result.details.account_holder_name || '',
            bank_name: result.details.bank_name || '',
            account_number: result.details.account_number || '',
            ifsc_code: result.details.ifsc_code || '',
            account_type: result.details.account_type || '',
            branch_name: result.details.branch_name || '',
            upi_id: result.details.upi_id || ''
          });
        }
      } catch (error) {
        console.warn('Failed to load Finverno bank details', error);
      }
    };

    const loadPaymentSubmissions = async () => {
      try {
        const response = await fetch('/api/investor/payment-submissions');
        const result = await response.json();
        if (response.ok && result?.success) {
          setPaymentSubmissions(result.submissions || []);
        }
      } catch (error) {
        console.warn('Failed to load payment submissions', error);
      }
    };

    loadBankDetails();
    loadPanDocument();
    loadFinvernoBankDetails();
    loadPaymentSubmissions();
  }, []);

  const handleSaveBankDetails = async () => {
    setBankSaving(true);
    setBankMessage(null);
    try {
      let cancelledChequePath = '';

      if (chequeFile) {
        const formData = new FormData();
        formData.append('file', chequeFile);
        formData.append('documentType', 'cancelled-cheque');

        const uploadResponse = await fetch('/api/investor/documents', {
          method: 'POST',
          body: formData
        });

        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok) {
          throw new Error(uploadResult?.error || 'Failed to upload cheque');
        }

        cancelledChequePath = uploadResult?.document?.path || '';
      }

      const saveResponse = await fetch('/api/investor/bank-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_account_holder: bankForm.accountHolder,
          bank_name: bankForm.bankName,
          bank_account_number: bankForm.accountNumber,
          bank_ifsc: bankForm.ifscCode,
          bank_branch: bankForm.branchName,
          cancelled_cheque_path: cancelledChequePath || undefined
        })
      });

      const saveResult = await saveResponse.json();
      if (!saveResponse.ok) {
        throw new Error(saveResult?.error || 'Failed to save bank details');
      }

      setChequeFile(null);
      setBankMessage('Bank details saved. We will verify and enable payouts.');
    } catch (error) {
      console.error('Failed to save bank details:', error);
      setBankMessage(error instanceof Error ? error.message : 'Failed to save bank details');
    } finally {
      setBankSaving(false);
    }
  };

  const handleUploadPan = async () => {
    if (!panFile) {
      setPanMessage('Please select a PAN file first.');
      return;
    }

    setPanUploading(true);
    setPanMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', panFile);
      formData.append('documentType', 'pan');

      const response = await fetch('/api/investor/documents', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to upload PAN');
      }

      setPanMessage('PAN uploaded successfully.');
      setPanFile(null);
      setPanDocument({
        name: result?.document?.name || panFileName || 'PAN',
        signedUrl: null,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to upload PAN:', error);
      setPanMessage(error instanceof Error ? error.message : 'Failed to upload PAN');
    } finally {
      setPanUploading(false);
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

      const refreshResponse = await fetch('/api/investor/payment-submissions');
      const refreshResult = await refreshResponse.json();
      if (refreshResponse.ok && refreshResult?.success) {
        setPaymentSubmissions(refreshResult.submissions || []);
      }
    } catch (error) {
      console.error('Failed to submit payment confirmation:', error);
      setPaymentSubmissionMessage(error instanceof Error ? error.message : 'Failed to submit payment confirmation');
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <DashboardLayout activeTab="financials">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Financial Management</h1>
          <p className="text-secondary">
            Comprehensive view of your investments, returns, and tax obligations
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-neutral-medium">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: '📊' },
                { id: 'transactions', name: 'Transactions', icon: '💳' },
                { id: 'payouts', name: 'Payouts', icon: '💰' },
                { id: 'tax', name: 'Tax Center', icon: '📋' }
              ].map((tab: { id: 'overview' | 'transactions' | 'payouts' | 'tax'; name: string; icon: string }) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    selectedTab === tab.id
                      ? 'border-accent-amber text-accent-amber'
                      : 'border-transparent text-secondary hover:text-primary'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {selectedTab === 'overview' && (
          <div className="space-y-8">
            {/* Financial Summary Cards */}
            <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6">
              <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                <div className="text-accent-amber text-sm font-mono mb-2">TOTAL INVESTED</div>
                <div className="text-2xl font-bold text-primary mb-1">{formatCurrency(portfolioMetrics.totalInvested)}</div>
                <div className="text-xs text-secondary">Principal amount</div>
              </div>
              
              <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                <div className="text-accent-amber text-sm font-mono mb-2">CURRENT VALUE</div>
                <div className="text-2xl font-bold text-primary mb-1">{formatCurrency(portfolioMetrics.currentValue)}</div>
                <div className="text-xs text-success">
                  {portfolioMetrics.totalInvested > 0
                    ? `+${((portfolioMetrics.currentValue - portfolioMetrics.totalInvested) / portfolioMetrics.totalInvested * 100).toFixed(1)}%`
                    : '—'}
                </div>
              </div>
              
              <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                <div className="text-accent-amber text-sm font-mono mb-2">TOTAL RETURNS</div>
                <div className="text-2xl font-bold text-success mb-1">{formatCurrency(portfolioMetrics.totalReturns)}</div>
                <div className="text-xs text-secondary">Capital returned</div>
              </div>
              
              <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                <div className="text-accent-amber text-sm font-mono mb-2">NET RETURNS</div>
                <div className="text-2xl font-bold text-primary mb-1">{formatCurrency(portfolioMetrics.netCapitalReturns)}</div>
                <div className="text-xs text-secondary">After fees</div>
              </div>
            </div>

            <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
              <h3 className="text-lg font-bold text-primary">Tax Summary</h3>
              <p className="text-sm text-secondary">
                Tax statements will be available once payout reports are finalized.
              </p>
            </div>
          </div>
        )}

        {selectedTab === 'payouts' && (
          <div className="space-y-8">
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
              <h2 className="text-xl font-semibold text-primary mb-2">Add Capital to Finverno</h2>
              <p className="text-secondary text-sm mb-6">
                Transfer funds to the account below, then submit payment confirmation for admin approval.
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="rounded-lg border border-neutral-medium bg-neutral-darker/40 p-4">
                  <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wide">Finverno Receiving Account</h3>
                  <div className="space-y-1 text-sm text-secondary">
                    <p><span className="text-primary">Account Holder:</span> {finvernoBankDetails.account_holder_name || '—'}</p>
                    <p><span className="text-primary">Bank:</span> {finvernoBankDetails.bank_name || '—'}</p>
                    <p><span className="text-primary">A/C Number:</span> {finvernoBankDetails.account_number || '—'}</p>
                    <p><span className="text-primary">A/C Type:</span> {finvernoBankDetails.account_type || '—'}</p>
                    <p><span className="text-primary">IFSC:</span> {finvernoBankDetails.ifsc_code || '—'}</p>
                    <p><span className="text-primary">Branch:</span> {finvernoBankDetails.branch_name || '—'}</p>
                    <p><span className="text-primary">UPI:</span> {finvernoBankDetails.upi_id || '—'}</p>
                  </div>
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

            <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
              <h2 className="text-xl font-semibold text-primary mb-2">Payout Preferences</h2>
              <p className="text-secondary text-sm mb-6">
                Provide your bank details and a cancelled cheque to enable automated payouts.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wide text-secondary">Account Holder Name</label>
                  <input
                    type="text"
                    value={bankForm.accountHolder}
                    onChange={(e) => handleBankFieldChange('accountHolder', e.target.value)}
                    className="mt-2 w-full rounded-lg border border-neutral-medium bg-neutral-darker px-3 py-2 text-sm text-primary"
                    placeholder="Name as per bank account"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-secondary">Bank Name</label>
                  <input
                    type="text"
                    value={bankForm.bankName}
                    onChange={(e) => handleBankFieldChange('bankName', e.target.value)}
                    className="mt-2 w-full rounded-lg border border-neutral-medium bg-neutral-darker px-3 py-2 text-sm text-primary"
                    placeholder="Bank name"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-secondary">Account Number</label>
                  <input
                    type="text"
                    value={bankForm.accountNumber}
                    onChange={(e) => handleBankFieldChange('accountNumber', e.target.value)}
                    className="mt-2 w-full rounded-lg border border-neutral-medium bg-neutral-darker px-3 py-2 text-sm text-primary"
                    placeholder="Account number"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-secondary">IFSC Code</label>
                  <input
                    type="text"
                    value={bankForm.ifscCode}
                    onChange={(e) => handleBankFieldChange('ifscCode', e.target.value)}
                    className="mt-2 w-full rounded-lg border border-neutral-medium bg-neutral-darker px-3 py-2 text-sm text-primary"
                    placeholder="IFSC code"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-secondary">Branch Name</label>
                  <input
                    type="text"
                    value={bankForm.branchName}
                    onChange={(e) => handleBankFieldChange('branchName', e.target.value)}
                    className="mt-2 w-full rounded-lg border border-neutral-medium bg-neutral-darker px-3 py-2 text-sm text-primary"
                    placeholder="Branch"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-secondary">Cancelled Cheque</label>
                  <div className="mt-2 flex items-center gap-3 rounded-lg border border-dashed border-neutral-medium bg-neutral-darker px-3 py-2 text-sm text-secondary">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setChequeFile(file);
                        setChequeFileName(file?.name || '');
                      }}
                      className="text-xs text-secondary"
                    />
                    {chequeFileName && (
                      <span className="text-xs text-primary">{chequeFileName}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <p className="text-xs text-secondary">
                  {bankMessage || 'We will verify these details before enabling payouts.'}
                </p>
                <Button size="sm" disabled={bankSaving} onClick={handleSaveBankDetails}>
                  {bankSaving ? 'Saving...' : 'Save Bank Details'}
                </Button>
              </div>
            </div>

            <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
              <h2 className="text-xl font-semibold text-primary mb-2">PAN Document</h2>
              <p className="text-secondary text-sm mb-6">
                Upload your PAN card for compliance and payout processing.
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="text-sm text-secondary"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setPanFile(file);
                    setPanFileName(file?.name || '');
                  }}
                />
                <Button variant="outline" size="sm" onClick={handleUploadPan} disabled={panUploading}>
                  {panUploading ? 'Uploading...' : panDocument ? 'Replace PAN' : 'Upload PAN'}
                </Button>
              </div>
              {panFileName && (
                <p className="text-xs text-secondary mt-2">Selected: {panFileName}</p>
              )}
              {panDocument && (
                <div className="mt-3 text-xs text-secondary">
                  Uploaded PAN: <span className="text-primary">{panDocument.name}</span>{' '}
                  {panDocument.createdAt ? `on ${formatDate(panDocument.createdAt)}` : ''}
                  {panDocument.signedUrl && (
                    <>
                      {' '}·{' '}
                      <a href={panDocument.signedUrl} className="text-accent-amber hover:underline" target="_blank" rel="noreferrer">
                        View
                      </a>
                    </>
                  )}
                </div>
              )}
              {panMessage && (
                <p className="text-xs text-secondary mt-2">{panMessage}</p>
              )}
            </div>

            <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
              <h2 className="text-xl font-semibold text-primary mb-2">Upcoming Payouts</h2>
              <p className="text-secondary text-sm mb-6">
                Completed capital returns are listed here.
              </p>
              <div className="space-y-4">
                {completedReturns.length === 0 && (
                  <div className="text-secondary text-sm">No completed returns yet.</div>
                )}
                {completedReturns.map((payout) => (
                  <div key={payout.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-neutral-medium rounded-lg p-4">
                    <div>
                      <div className="text-primary font-medium">{payout.projectName}</div>
                      <div className="text-xs text-secondary">{payout.description || 'Capital return'}</div>
                      <div className="text-xs text-secondary mt-1">{payout.date ? formatDate(payout.date) : 'Date not set'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-primary font-semibold">{formatCurrency(payout.amount)}</div>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${getStatusColor(payout.status)}`}>
                        {payout.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'transactions' && (
          <div className="space-y-6">
            {/* Transactions Table */}
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="p-6 border-b border-neutral-medium">
                <h3 className="text-lg font-bold text-primary">Transaction History</h3>
                <p className="text-sm text-secondary">Complete record of all financial transactions</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-medium">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-primary">Date</th>
                      <th className="text-left p-4 text-sm font-medium text-primary">Type</th>
                      <th className="text-left p-4 text-sm font-medium text-primary">Project</th>
                      <th className="text-right p-4 text-sm font-medium text-primary">Amount</th>
                      <th className="text-center p-4 text-sm font-medium text-primary">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-primary">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 && (
                      <tr>
                        <td className="p-4 text-sm text-secondary" colSpan={6}>
                          No transactions available yet.
                        </td>
                      </tr>
                    )}
                    {transactions.map((txn) => (
                      <tr key={txn.id} className="border-b border-neutral-medium">
                        <td className="p-4 text-sm text-primary">{formatDate(txn.date)}</td>
                        <td className="p-4">
                          <div className="text-sm font-medium text-primary">{txn.type}</div>
                          <div className="text-xs text-secondary">{txn.description}</div>
                        </td>
                        <td className="p-4 text-sm text-secondary">{txn.projectName}</td>
                        <td className={`p-4 text-sm text-right font-medium ${getTransactionColor(txn.type, txn.amount)}`}>
                          {formatCurrency(txn.amount)}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(txn.status)}`}>
                            {txn.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-secondary font-mono">{txn.reference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'tax' && (
          <div className="space-y-8">
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
              <h2 className="text-xl font-semibold text-primary mb-2">Tax Center</h2>
              <p className="text-secondary text-sm">
                Tax statements will be available once payout reports are finalized.
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
