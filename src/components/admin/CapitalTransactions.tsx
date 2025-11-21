'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components';

interface Investor {
  id: string;
  email: string;
  name: string;
  investor_type: 'Individual' | 'HNI' | 'Family Office' | 'Institutional';
  phone?: string;
  status: 'pending' | 'active' | 'suspended';
}

interface InvestorAccount {
  investor_id: string;
  total_committed: number;
  available_balance: number;
  deployed_capital: number;
  returned_capital: number;
  created_at: string;
  updated_at: string;
}

interface CapitalTransaction {
  id: string;
  investor_id: string;
  transaction_type: 'inflow' | 'deployment' | 'return' | 'withdrawal';
  amount: number;
  project_id?: string;
  purchase_request_id?: string | null;
  description: string;
  admin_user_id: string;
  status: 'pending' | 'completed' | 'failed';
  reference_number?: string;
  created_at: string;
  investor?: Investor;
  project_name?: string;
}

interface TransactionFormData {
  investor_id: string;
  transaction_type: 'inflow' | 'deployment' | 'return' | 'withdrawal';
  amount: string;
  contractor_id: string;
  contractor_name: string;
  project_id: string;
  project_name: string;
  purchase_request_id: string;
  description: string;
  reference_number: string;
}

interface FundingPurchaseRequest {
  id: string;
  project_id: string;
  contractor_id: string;
  estimated_total?: number;
  status: string;
  funded_amount?: number;
  remaining_amount?: number;
  funding_progress?: number | null;
  contractors?: {
    company_name: string;
    contact_person?: string;
  };
  project?: {
    name?: string | null;
    location?: string | null;
  } | null;
}

const CapitalTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<CapitalTransaction[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [accounts, setAccounts] = useState<InvestorAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [purchaseRequests, setPurchaseRequests] = useState<FundingPurchaseRequest[]>([]);
  const [purchaseRequestsLoading, setPurchaseRequestsLoading] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState<TransactionFormData>({
    investor_id: '',
    transaction_type: 'inflow',
    amount: '',
    contractor_id: '',
    contractor_name: '',
    project_id: '',
    project_name: '',
    purchase_request_id: '',
    description: '',
    reference_number: ''
  });
  const showInvestorSelect = formData.transaction_type !== 'return';

  const fetchTransactions = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      
      if (selectedInvestor) params.append('investor_id', selectedInvestor);
      if (filterType) params.append('transaction_type', filterType);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/admin/capital/transactions?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transactions');
      }

      setTransactions(data.transactions);
      setCurrentPage(data.pagination.page);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [selectedInvestor, filterType, searchTerm]);

  const fetchInvestors = async () => {
    try {
      const response = await fetch('/api/admin/investors');
      const data = await response.json();
      if (response.ok) {
        setInvestors(data.investors);
      }
    } catch (err) {
      console.error('Failed to fetch investors:', err);
    }
  };

  const fetchAccounts = async () => {
    try {
      setAccountsLoading(true);
      const response = await fetch('/api/admin/capital/accounts');
      const data = await response.json();
      if (response.ok) {
        setAccounts(data.accounts || []);
      } else {
        console.error('Failed to fetch investor accounts:', data.error || data);
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    } finally {
      setAccountsLoading(false);
    }
  };

  const getRemainingAmount = useCallback((request?: FundingPurchaseRequest | null) => {
    if (!request) return null;
    if (typeof request.remaining_amount === 'number') {
      return request.remaining_amount;
    }
    const estimatedTotal = Number(request.estimated_total ?? 0);
    if (!estimatedTotal || estimatedTotal <= 0) {
      return null;
    }
    const fundedAmount = Number(request.funded_amount ?? 0);
    return Math.max(estimatedTotal - fundedAmount, 0);
  }, []);

  const fetchPurchaseRequests = useCallback(async () => {
    try {
      setPurchaseRequestsLoading(true);
      const response = await fetch('/api/admin/purchase-requests?status=all&limit=200');
      const data = await response.json();
      if (response.ok && data.success) {
        setPurchaseRequests(data.data.requests || []);
      } else {
        console.error('Failed to fetch purchase requests for funding:', data.error || data);
      }
    } catch (err) {
      console.error('Failed to fetch purchase requests:', err);
    } finally {
      setPurchaseRequestsLoading(false);
    }
  }, []);

  const getEligiblePurchaseRequests = () => {
    const statusesForDeployment = ['submitted', 'approved'];
    const statusesForReturn = ['funded', 'po_generated', 'completed'];
    if (formData.transaction_type === 'deployment') {
      return purchaseRequests.filter((request) => {
        if (!statusesForDeployment.includes(request.status)) {
          return false;
        }
        const remaining = getRemainingAmount(request);
        return remaining === null || remaining > 0;
      });
    }
    if (formData.transaction_type === 'return') {
      return purchaseRequests.filter((request) =>
        statusesForReturn.includes(request.status)
      );
    }
    return [];
  };

  const handlePurchaseRequestSelection = (purchaseRequestId: string) => {
    setFormData(prev => ({
      ...prev,
      purchase_request_id: purchaseRequestId
    }));

    if (!purchaseRequestId) {
      return;
    }

    const selectedRequest = purchaseRequests.find(pr => pr.id === purchaseRequestId);
    if (!selectedRequest) return;

    const remainingAmount = getRemainingAmount(selectedRequest);
    const hasRemaining = typeof remainingAmount === 'number' && remainingAmount > 0;
    const shouldAutoFillAmount = formData.transaction_type === 'deployment';

    setFormData(prev => ({
      ...prev,
      purchase_request_id: purchaseRequestId,
      contractor_id: selectedRequest.contractor_id || '',
      contractor_name: selectedRequest.contractors?.company_name || '',
      project_id: selectedRequest.project_id || '',
      project_name: selectedRequest.project?.name || '',
      amount: (() => {
        if (!shouldAutoFillAmount) {
          return prev.amount || '';
        }
        if (hasRemaining && remainingAmount !== null) {
          return remainingAmount.toString();
        }
        if (selectedRequest.estimated_total) {
          return selectedRequest.estimated_total.toString();
        }
        return prev.amount || '';
      })(),
      description:
        prev.description ||
        `${formData.transaction_type === 'return' ? 'Capital return' : 'Capital deployment'} for purchase request ${purchaseRequestId
          .slice(0, 8)
          .toUpperCase()}`
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing('create');
    
    try {
      const amountValue = parseFloat(formData.amount);
      if (!Number.isFinite(amountValue) || amountValue <= 0) {
        throw new Error('Please enter a valid amount greater than zero.');
      }

      const payload: Record<string, unknown> = {
        transaction_type: formData.transaction_type,
        amount: amountValue,
        description: formData.description.trim(),
      };

      if (formData.reference_number.trim()) {
        payload.reference_number = formData.reference_number.trim();
      }

      if (formData.purchase_request_id) {
        payload.purchase_request_id = formData.purchase_request_id;
      }

      if (showInvestorSelect) {
        payload.investor_id = formData.investor_id;
        payload.contractor_id = formData.contractor_id || undefined;
        payload.contractor_name = formData.contractor_name || undefined;
        payload.project_id = formData.project_id || undefined;
        payload.project_name = formData.project_name || undefined;
      }

      const response = await fetch('/api/admin/capital/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create transaction');
      }

      // Reset form and refresh data
    setFormData({
      investor_id: '',
      transaction_type: 'inflow',
      amount: '',
      project_id: '',
      project_name: '',
      contractor_id: '',
      contractor_name: '',
      purchase_request_id: '',
      description: '',
      reference_number: ''
    });
      setShowAddForm(false);
      fetchTransactions(currentPage);
      fetchAccounts(); // Refresh account balances
      fetchPurchaseRequests(); // Refresh purchase request list

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setProcessing(null);
    }
  };

  const resetForm = () => {
    setFormData({
      investor_id: '',
      transaction_type: 'inflow',
      amount: '',
      contractor_id: '',
      contractor_name: '',
      project_id: '',
      project_name: '',
      purchase_request_id: '',
      description: '',
      reference_number: ''
    });
    setShowAddForm(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchInvestors();
    fetchAccounts();
  }, []);

  useEffect(() => {
    fetchPurchaseRequests();
  }, [fetchPurchaseRequests]);

  useEffect(() => {
    if (showAddForm) {
      fetchAccounts();
    }
  }, [showAddForm]);

  useEffect(() => {
    if (
      formData.purchase_request_id &&
      formData.transaction_type !== 'deployment' &&
      formData.transaction_type !== 'return'
    ) {
      setFormData(prev => ({
        ...prev,
        purchase_request_id: ''
      }));
    }
  }, [formData.transaction_type, formData.purchase_request_id]);

  const getTransactionTypeColor = (type: string) => {
    const colors = {
      inflow: 'text-success',
      deployment: 'text-accent-blue',
      return: 'text-accent-amber',
      withdrawal: 'text-error'
    };
    return colors[type as keyof typeof colors] || 'text-secondary';
  };

  const getTransactionTypeBadge = (type: string) => {
    const badges = {
      inflow: 'bg-success/10 text-success border-success/20',
      deployment: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20',
      return: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20',
      withdrawal: 'bg-error/10 text-error border-error/20'
    };
    return badges[type as keyof typeof badges] || 'bg-neutral-medium/10 text-secondary border-neutral-medium/20';
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20',
      completed: 'bg-success/10 text-success border-success/20',
      failed: 'bg-error/10 text-error border-error/20'
    };
    return badges[status as keyof typeof badges] || 'bg-neutral-medium/10 text-secondary border-neutral-medium/20';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getInvestorAccount = (investorId: string) => {
    return accounts.find(acc => acc.investor_id === investorId);
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-orange"></div>
        <span className="ml-3 text-secondary">Loading capital transactions...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Capital Transaction Management</h1>
        <p className="text-secondary">Manage investor capital inflows, deployments, returns, and withdrawals</p>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg mb-6">
          <div className="flex items-center">
            <span className="text-lg mr-2">⚠️</span>
            {error}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Capital Overview Cards */}
        <div className="lg:col-span-1">
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Capital Summary</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-secondary">Total Committed</div>
                  <div className="text-lg font-bold text-primary">
                    {formatCurrency(accounts.reduce((sum, acc) => sum + acc.total_committed, 0))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-secondary">Available Balance</div>
                  <div className="text-lg font-bold text-success">
                    {formatCurrency(accounts.reduce((sum, acc) => sum + acc.available_balance, 0))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-secondary">Deployed Capital</div>
                  <div className="text-lg font-bold text-accent-blue">
                    {formatCurrency(accounts.reduce((sum, acc) => sum + acc.deployed_capital, 0))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-secondary">Returns Paid</div>
                  <div className="text-lg font-bold text-accent-amber">
                    {formatCurrency(accounts.reduce((sum, acc) => sum + acc.returned_capital, 0))}
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-4">
              <h3 className="text-lg font-semibold text-primary mb-4">Filters</h3>
              <div className="space-y-3">
                <Button
                  onClick={() => setShowAddForm(true)}
                  variant="primary"
                  className="w-full"
                >
                  New Transaction
                </Button>
                
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Investor
                  </label>
                  <select
                    value={selectedInvestor}
                    onChange={(e) => setSelectedInvestor(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                  >
                    <option value="">All Investors</option>
                    {investors.map(investor => (
                      <option key={investor.id} value={investor.id}>
                        {investor.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Transaction Type
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                  >
                    <option value="">All Types</option>
                    <option value="inflow">Capital Inflow</option>
                    <option value="deployment">Deployment</option>
                    <option value="return">Return</option>
                    <option value="withdrawal">Withdrawal</option>
                  </select>
                </div>

                <div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search transactions..."
                    className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                  />
                </div>

                <Button
                  onClick={() => {
                    setSelectedInvestor('');
                    setFilterType('');
                    setSearchTerm('');
                  }}
                  variant="secondary"
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="lg:col-span-3">
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
            <div className="p-6 border-b border-neutral-medium">
              <h2 className="text-xl font-semibold text-primary">Transaction History</h2>
              <p className="text-sm text-secondary">All capital movements and investor transactions</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-medium/30">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Investor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-medium">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center">
                        <div className="text-4xl mb-4">💰</div>
                        <h3 className="text-lg font-semibold text-primary mb-2">No Transactions</h3>
                        <p className="text-secondary">No capital transactions found. Create a new transaction to get started.</p>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-neutral-medium/20">
                        <td className="px-4 py-3 text-sm text-primary">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-sm font-medium text-primary">
                              {transaction.investor?.name}
                            </div>
                            <div className="text-xs text-secondary">
                              {transaction.investor?.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded border capitalize ${getTransactionTypeBadge(transaction.transaction_type)}`}>
                            {transaction.transaction_type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-semibold ${getTransactionTypeColor(transaction.transaction_type)}`}>
                            {transaction.transaction_type === 'deployment' || transaction.transaction_type === 'withdrawal' ? '-' : '+'}
                            {formatCurrency(transaction.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-primary">
                            {transaction.description}
                          </div>
                          {transaction.reference_number && (
                            <div className="text-xs text-secondary">
                              Ref: {transaction.reference_number}
                            </div>
                          )}
                          {transaction.project_name && (
                            <div className="text-xs text-accent-blue">
                              Project: {transaction.project_name}
                            </div>
                          )}
                          {transaction.purchase_request_id && (
                            <div className="text-xs text-secondary">
                              Purchase Request: {transaction.purchase_request_id.slice(0, 8).toUpperCase()}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded border capitalize ${getStatusBadge(transaction.status)}`}>
                            {transaction.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            <button className="text-accent-blue hover:text-accent-blue/80 text-xs">
                              View
                            </button>
                            {transaction.status === 'pending' && (
                              <button className="text-success hover:text-success/80 text-xs">
                                Approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-neutral-medium">
                <div className="flex justify-between items-center">
                  <Button
                    onClick={() => fetchTransactions(currentPage - 1)}
                    disabled={currentPage === 1}
                    variant="secondary"
                    className="text-sm"
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-secondary">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    onClick={() => fetchTransactions(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    variant="secondary"
                    className="text-sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Transaction Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-medium">
              <h2 className="text-xl font-semibold text-primary">New Capital Transaction</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {showInvestorSelect && (
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Investor *
                  </label>
                  <select
                    required={showInvestorSelect}
                    value={formData.investor_id}
                    onChange={(e) => setFormData({ ...formData, investor_id: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                  >
                    <option value="">Select Investor</option>
                    {investors.filter(inv => inv.status === 'active').map(investor => {
                      const account = getInvestorAccount(investor.id);
                      const balanceLabel = accountsLoading
                        ? 'Loading...'
                        : account
                          ? formatCurrency(Number(account.available_balance ?? 0))
                          : '0 (No account yet)';
                      return (
                        <option key={investor.id} value={investor.id}>
                          {investor.name} - Balance: {balanceLabel}
                        </option>
                      );
                    })}
                  </select>
                  {formData.investor_id && (
                    <div className="mt-2 text-xs text-secondary border border-neutral-medium rounded-md p-2 bg-neutral-darker/40">
                      {(() => {
                        const account = getInvestorAccount(formData.investor_id);
                        if (accountsLoading) {
                          return 'Fetching investor balance...';
                        }
                        if (!account) {
                          return 'No investor account found yet. Record an inflow to establish the balance.';
                        }
                        return (
                          <>
                            <div>Available Balance: {formatCurrency(Number(account.available_balance ?? 0))}</div>
                            <div>Total Committed: {formatCurrency(Number(account.total_committed ?? 0))}</div>
                            <div>Deployed Capital: {formatCurrency(Number(account.deployed_capital ?? 0))}</div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Transaction Type *
                </label>
                <select
                  required
                  value={formData.transaction_type}
                  onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value as TransactionFormData['transaction_type'] })}
                  className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                >
                  <option value="inflow">Capital Inflow</option>
                  <option value="deployment">Capital Deployment</option>
                  <option value="return">Return Payment</option>
                  <option value="withdrawal">Withdrawal</option>
                </select>
              </div>

              {formData.transaction_type !== 'deployment' && (
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                    placeholder="Enter amount"
                  />
                </div>
              )}

              {(formData.transaction_type === 'deployment' || formData.transaction_type === 'return') && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-primary">
                    {formData.transaction_type === 'return'
                      ? 'Purchase Request to Record Return'
                      : 'Purchase Request to Fund'}
                  </label>
                  <select
                    value={formData.purchase_request_id}
                    onChange={(e) => handlePurchaseRequestSelection(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange disabled:opacity-50"
                    disabled={purchaseRequestsLoading}
                  >
                    <option value="">
                    {purchaseRequestsLoading ? 'Loading purchase requests...' : 'Select Purchase Request'}
                  </option>
                  {getEligiblePurchaseRequests().map((request) => {
                    const contractorName = request.contractors?.company_name || 'Contractor';
                    const projectName = request.project?.name || 'Project';
                    const remainingAmount = getRemainingAmount(request);
                    const requestedAmount = Number(request.estimated_total || 0);
                    const fundedAmount = Number(request.funded_amount || 0);
                    const formattedRemaining = remainingAmount !== null
                      ? formatCurrency(remainingAmount)
                      : 'N/A';

                    return (
                      <option
                        key={request.id}
                        value={request.id}
                      >
                        {projectName} • {contractorName} • Requested {formatCurrency(requestedAmount)} • Funded {formatCurrency(fundedAmount)} • Remaining {formattedRemaining}
                      </option>
                    );
                  })}
                  </select>
                  {formData.purchase_request_id && (() => {
                    const request = purchaseRequests.find(pr => pr.id === formData.purchase_request_id);
                    if (!request) return null;
                    const remainingAmount = getRemainingAmount(request);
                    const fundedAmount = Number(request.funded_amount || 0);
                    const requestedAmount = Number(request.estimated_total || 0);
                    const contractorName = request.contractors?.company_name || 'N/A';
                    const projectName = request.project?.name || request.project_id;
                    const progressPercentage = remainingAmount === null || requestedAmount === 0
                      ? null
                      : Math.min(Math.round(((requestedAmount - remainingAmount) / requestedAmount) * 100), 100);

                    return (
                      <div className="text-xs text-secondary border border-accent-orange/40 rounded-md p-3 bg-accent-orange/5">
                        <div className="text-primary font-medium mb-1">
                          Request #{request.id.slice(0, 8).toUpperCase()}
                        </div>
                        <div>Contractor: {contractorName}</div>
                        <div>Project: {projectName}</div>
                        <div>Requested: {formatCurrency(requestedAmount)}</div>
                        <div>Funded: {formatCurrency(fundedAmount)}</div>
                        <div>Remaining: {remainingAmount !== null ? formatCurrency(remainingAmount) : 'Awaiting vendor quotes'}</div>
                        {progressPercentage !== null && (
                          <div className="mt-2">
                            <div className="w-full bg-neutral-medium rounded-full h-2">
                              <div
                                className="h-2 rounded-full bg-accent-orange"
                                style={{ width: `${progressPercentage}%` }}
                              ></div>
                            </div>
                            <div className="mt-1 text-[11px] text-primary font-semibold">
                              {progressPercentage}% funded
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {formData.transaction_type === 'return' && (
                    <p className="text-xs text-secondary">
                      Repayments are automatically distributed to all investors who funded this purchase request, based on their share of deployed capital.
                    </p>
                  )}
                  {formData.transaction_type === 'deployment' && (
                    <div>
                      <label className="block text-sm font-medium text-primary">
                        Amount (₹) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                        placeholder="Enter amount"
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                  placeholder="Bank reference, transaction ID, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Description *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                  placeholder="Transaction description"
                />
              </div>
              
              <div className="flex space-x-4 pt-4">
                <Button 
                  type="submit" 
                  variant="primary"
                  disabled={processing === 'create'}
                >
                  {processing === 'create' ? 'Creating...' : 'Create Transaction'}
                </Button>
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CapitalTransactions;
