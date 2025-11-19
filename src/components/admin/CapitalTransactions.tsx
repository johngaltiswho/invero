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

interface Contractor {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  status: string;
  verification_status?: string;
}

interface Project {
  id: string;
  project_name: string;
  contractor_id: string;
  client_name: string;
  estimated_value: number;
  funding_required: number;
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
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
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

  const fetchContractors = async () => {
    try {
      const response = await fetch('/api/admin/contractors');
      const data = await response.json();
      console.log('Contractors API response:', data);
      if (response.ok && data.success) {
        console.log('Setting contractors:', data.data.contractors);
        setContractors(data.data.contractors || []);
      } else {
        console.error('Contractors API error:', data);
      }
    } catch (err) {
      console.error('Failed to fetch contractors:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/admin/projects');
      const data = await response.json();
      if (response.ok) {
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  const fetchPurchaseRequests = async () => {
    try {
      setPurchaseRequestsLoading(true);
      const response = await fetch('/api/admin/purchase-requests?status=all&limit=200');
      const data = await response.json();
      if (response.ok && data.success) {
        const allowedStatuses = ['submitted', 'approved', 'funded'];
        const filtered = (data.data.requests || []).filter((request: FundingPurchaseRequest) =>
          allowedStatuses.includes(request.status)
        );
        setPurchaseRequests(filtered);
      } else {
        console.error('Failed to fetch purchase requests for funding:', data.error || data);
      }
    } catch (err) {
      console.error('Failed to fetch purchase requests:', err);
    } finally {
      setPurchaseRequestsLoading(false);
    }
  };

  // Handle contractor selection and filter projects
  const handleContractorChange = (
    contractorId: string,
    options?: { projectId?: string; projectName?: string }
  ) => {
    const selectedContractor = contractors.find(c => c.id === contractorId);
    
    const contractorProjects = projects.filter(p => p.contractor_id === contractorId);
    setFilteredProjects(contractorProjects);

    setFormData(prev => ({
      ...prev,
      contractor_id: contractorId,
      contractor_name: selectedContractor?.company_name || '',
      project_id: options?.projectId ?? '',
      project_name: options?.projectName ?? '',
      purchase_request_id: options?.projectId ? prev.purchase_request_id : ''
    }));
  };

  // Handle project selection
  const handleProjectChange = (projectId: string) => {
    const selectedProject = projects.find(p => p.id === projectId);
    
    setFormData(prev => ({
      ...prev,
      project_id: projectId,
      project_name: selectedProject?.project_name || '',
      purchase_request_id: ''
    }));
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

    if (selectedRequest.contractor_id) {
      handleContractorChange(selectedRequest.contractor_id, {
        projectId: selectedRequest.project_id,
        projectName: selectedRequest.project?.name || ''
      });
    }

    setFormData(prev => ({
      ...prev,
      purchase_request_id: purchaseRequestId,
      contractor_id: selectedRequest.contractor_id || prev.contractor_id,
      contractor_name: selectedRequest.contractors?.company_name || prev.contractor_name,
      project_id: selectedRequest.project_id || prev.project_id,
      project_name: selectedRequest.project?.name || prev.project_name,
      amount: selectedRequest.estimated_total ? selectedRequest.estimated_total.toString() : prev.amount || '',
      description: prev.description || `Capital deployment for purchase request ${purchaseRequestId.slice(0, 8).toUpperCase()}`
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing('create');
    
    try {
      const response = await fetch('/api/admin/capital/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
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
    setFilteredProjects([]);
    setShowAddForm(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchInvestors();
    fetchAccounts();
    fetchContractors();
    fetchProjects();
    fetchPurchaseRequests();
  }, []);

  useEffect(() => {
    if (showAddForm) {
      fetchAccounts();
    }
  }, [showAddForm]);

  useEffect(() => {
    if (formData.transaction_type !== 'deployment' && formData.purchase_request_id) {
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
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Investor *
                </label>
                <select
                  required
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

              {formData.transaction_type === 'deployment' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-primary">
                    Purchase Request to Fund
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
                    {purchaseRequests.map((request) => (
                      <option key={request.id} value={request.id}>
                        {request.project?.name || 'Project'} • {request.contractors?.company_name || 'Contractor'} • ₹
                        {(request.estimated_total || 0).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  {formData.purchase_request_id && (() => {
                    const request = purchaseRequests.find(pr => pr.id === formData.purchase_request_id);
                    if (!request) return null;
                    return (
                      <div className="text-xs text-secondary border border-accent-orange/40 rounded-md p-3 bg-accent-orange/5">
                        <div className="text-primary font-medium mb-1">
                          Request #{request.id.slice(0, 8).toUpperCase()}
                        </div>
                        <div>Contractor: {request.contractors?.company_name || 'N/A'}</div>
                        <div>Project: {request.project?.name || request.project_id}</div>
                        <div>Funding Needed: ₹{(request.estimated_total || 0).toLocaleString()}</div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {((formData.transaction_type === 'deployment' && !formData.purchase_request_id) || formData.transaction_type === 'return') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Contractor *
                    </label>
                    <select
                      required={formData.transaction_type === 'return' || (formData.transaction_type === 'deployment' && !formData.purchase_request_id)}
                      value={formData.contractor_id}
                      onChange={(e) => handleContractorChange(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                    >
                      <option value="">Select Contractor</option>
                      {(() => {
                        const filteredContractors = contractors.filter(contractor => 
                          contractor.verification_status === 'verified' || contractor.status === 'approved'
                        );
                        console.log('All contractors:', contractors);
                        console.log('Filtered contractors:', filteredContractors);
                        return filteredContractors.map(contractor => (
                          <option key={contractor.id} value={contractor.id}>
                            {contractor.company_name} - {contractor.contact_person}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Project *
                    </label>
                    <select
                      required={formData.transaction_type === 'return' || (formData.transaction_type === 'deployment' && !formData.purchase_request_id)}
                      value={formData.project_id}
                      onChange={(e) => handleProjectChange(e.target.value)}
                      disabled={!formData.contractor_id}
                      className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange disabled:opacity-50"
                    >
                      <option value="">
                        {formData.contractor_id ? 'Select Project' : 'First select a contractor'}
                      </option>
                      {filteredProjects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.project_name} - {project.client_name} ({new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            minimumFractionDigits: 0,
                          }).format(project.funding_required)})
                        </option>
                      ))}
                    </select>
                    {formData.contractor_id && filteredProjects.length === 0 && (
                      <p className="text-xs text-secondary mt-1">
                        No projects found for selected contractor
                      </p>
                    )}
                  </div>
                </>
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
