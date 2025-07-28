'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components';
import { mockInvestments, mockProjects, getProjectById } from '@/data/mockData';

export default function FinancialManagement(): React.ReactElement {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'transactions' | 'payouts' | 'tax'>('overview');
  const [selectedTimeframe, setSelectedTimeframe] = useState('12months');

  // Mock financial data for current investor (INV_001)
  const financialData = {
    totalInvested: 24500000,
    currentValue: 27850000,
    totalReturns: 3350000,
    unrealizedGains: 2100000,
    realizedGains: 1250000,
    taxableincome: 875000,
    tdsDeducted: 131250,
    netReceivable: 743750
  };

  const transactions = [
    {
      id: 'TXN_2024_089',
      date: '2024-12-01',
      type: 'Interest Payment',
      projectName: 'Smart Manufacturing - Tata Motors',
      amount: 150000,
      status: 'Completed',
      reference: 'INT_PROJ_156_NOV24',
      description: 'Monthly interest payment - Milestone 2 completion'
    },
    {
      id: 'TXN_2024_088',
      date: '2024-11-30',
      type: 'Investment',
      projectName: 'Digital Infrastructure - HCL Tech',
      amount: -2500000,
      status: 'Completed',
      reference: 'INV_PROJ_148',
      description: 'Initial investment in project financing'
    },
    {
      id: 'TXN_2024_087',
      date: '2024-11-01',
      type: 'Interest Payment',
      projectName: 'Smart Manufacturing - Tata Motors',
      amount: 150000,
      status: 'Completed',
      reference: 'INT_PROJ_156_OCT24',
      description: 'Monthly interest payment - Milestone 1 completion'
    },
    {
      id: 'TXN_2024_086',
      date: '2024-10-15',
      type: 'Principal Repayment',
      projectName: 'IT Infrastructure - Bosch',
      amount: 3850000,
      status: 'Completed',
      reference: 'PRIN_PROJ_063_FINAL',
      description: 'Final principal repayment with returns'
    },
    {
      id: 'TXN_2024_085',
      date: '2024-10-01',
      type: 'Investment',
      projectName: 'Smart Manufacturing - Tata Motors',
      amount: -5000000,
      status: 'Completed',
      reference: 'INV_PROJ_156',
      description: 'Initial investment in project financing'
    }
  ];

  const upcomingPayouts = [
    {
      id: 'PAYOUT_001',
      date: '2024-12-31',
      projectName: 'Smart Manufacturing - Tata Motors',
      type: 'Interest Payment',
      amount: 150000,
      status: 'Scheduled',
      description: 'Monthly interest - December 2024'
    },
    {
      id: 'PAYOUT_002',
      date: '2025-01-31',
      projectName: 'Digital Infrastructure - HCL Tech',
      type: 'Interest Payment',
      amount: 135000,
      status: 'Scheduled',
      description: 'Monthly interest - January 2025'
    },
    {
      id: 'PAYOUT_003',
      date: '2025-01-31',
      projectName: 'Smart Manufacturing - Tata Motors',
      type: 'Interest Payment',
      amount: 150000,
      status: 'Scheduled',
      description: 'Monthly interest - January 2025'
    },
    {
      id: 'PAYOUT_004',
      date: '2025-05-15',
      projectName: 'Digital Infrastructure - HCL Tech',
      type: 'Principal + Interest',
      amount: 2905000,
      status: 'Projected',
      description: 'Final payment on project completion'
    },
    {
      id: 'PAYOUT_005',
      date: '2025-06-30',
      projectName: 'Smart Manufacturing - Tata Motors',
      type: 'Principal + Interest',
      amount: 5740000,
      status: 'Projected',
      description: 'Final payment on project completion'
    }
  ];

  const taxSummary = {
    currentFY: '2024-25',
    interestIncome: 485000,
    capitalGains: 390000,
    totalTaxableIncome: 875000,
    tdsDeducted: 131250,
    applicableTaxRate: '30%',
    estimatedTaxLiability: 262500,
    netTaxPayable: 131250
  };

  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount);
    return `${amount < 0 ? '-' : ''}₹${absAmount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTransactionColor = (type: string, amount: number) => {
    if (amount < 0) return 'text-warning'; // Outgoing
    switch (type) {
      case 'Interest Payment': return 'text-success';
      case 'Principal Repayment': return 'text-accent-amber';
      case 'Dividend': return 'text-accent-blue';
      default: return 'text-primary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-success/10 text-success';
      case 'Scheduled': return 'bg-accent-blue/10 text-accent-blue';
      case 'Projected': return 'bg-accent-amber/10 text-accent-amber';
      case 'Pending': return 'bg-warning/10 text-warning';
      default: return 'bg-neutral-medium text-secondary';
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
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id as any)}
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
                <div className="text-2xl font-bold text-primary mb-1">{formatCurrency(financialData.totalInvested)}</div>
                <div className="text-xs text-secondary">Principal amount</div>
              </div>
              
              <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                <div className="text-accent-amber text-sm font-mono mb-2">CURRENT VALUE</div>
                <div className="text-2xl font-bold text-primary mb-1">{formatCurrency(financialData.currentValue)}</div>
                <div className="text-xs text-success">+{((financialData.currentValue - financialData.totalInvested) / financialData.totalInvested * 100).toFixed(1)}%</div>
              </div>
              
              <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                <div className="text-accent-amber text-sm font-mono mb-2">TOTAL RETURNS</div>
                <div className="text-2xl font-bold text-success mb-1">{formatCurrency(financialData.totalReturns)}</div>
                <div className="text-xs text-secondary">All-time gains</div>
              </div>
              
              <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                <div className="text-accent-amber text-sm font-mono mb-2">NET RECEIVABLE</div>
                <div className="text-2xl font-bold text-primary mb-1">{formatCurrency(financialData.netReceivable)}</div>
                <div className="text-xs text-secondary">After tax deductions</div>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
                <div className="p-6 border-b border-neutral-medium">
                  <h3 className="text-lg font-bold text-primary">Returns Breakdown</h3>
                  <p className="text-sm text-secondary">Analysis of realized vs unrealized gains</p>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-secondary">Unrealized Gains</span>
                      <span className="text-sm font-medium text-accent-amber">{formatCurrency(financialData.unrealizedGains)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-secondary">Realized Gains</span>
                      <span className="text-sm font-medium text-success">{formatCurrency(financialData.realizedGains)}</span>
                    </div>
                    <div className="border-t border-neutral-medium pt-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-primary">Total Returns</span>
                        <span className="text-sm font-bold text-success">{formatCurrency(financialData.totalReturns)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
                <div className="p-6 border-b border-neutral-medium">
                  <h3 className="text-lg font-bold text-primary">Tax Summary (FY 2024-25)</h3>
                  <p className="text-sm text-secondary">Current financial year tax obligations</p>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-secondary">Taxable Income</span>
                      <span className="text-sm font-medium text-primary">{formatCurrency(financialData.taxableincome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-secondary">TDS Deducted</span>
                      <span className="text-sm font-medium text-warning">{formatCurrency(financialData.tdsDeducted)}</span>
                    </div>
                    <div className="border-t border-neutral-medium pt-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-primary">Net Receivable</span>
                        <span className="text-sm font-bold text-success">{formatCurrency(financialData.netReceivable)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'transactions' && (
          <div className="space-y-6">
            {/* Transaction Filters */}
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
              <div className="grid md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Time Period</label>
                  <select 
                    value={selectedTimeframe} 
                    onChange={(e) => setSelectedTimeframe(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-medium border border-neutral-light rounded text-primary text-sm"
                  >
                    <option value="12months">Last 12 Months</option>
                    <option value="6months">Last 6 Months</option>
                    <option value="3months">Last 3 Months</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Transaction Type</label>
                  <select className="w-full px-3 py-2 bg-neutral-medium border border-neutral-light rounded text-primary text-sm">
                    <option value="all">All Types</option>
                    <option value="investment">Investments</option>
                    <option value="interest">Interest Payments</option>
                    <option value="principal">Principal Repayments</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Project</label>
                  <select className="w-full px-3 py-2 bg-neutral-medium border border-neutral-light rounded text-primary text-sm">
                    <option value="all">All Projects</option>
                    <option value="proj_156">Tata Motors Project</option>
                    <option value="proj_148">HCL Tech Project</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button variant="primary" size="sm">
                    Export CSV
                  </Button>
                </div>
              </div>
            </div>

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

        {selectedTab === 'payouts' && (
          <div className="space-y-6">
            {/* Upcoming Payouts */}
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="p-6 border-b border-neutral-medium">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-primary">Upcoming Payouts</h3>
                    <p className="text-sm text-secondary">Scheduled and projected payments</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-secondary">Next 6 Months</div>
                    <div className="text-lg font-bold text-success">₹89.8L expected</div>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-medium">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-primary">Expected Date</th>
                      <th className="text-left p-4 text-sm font-medium text-primary">Project</th>
                      <th className="text-left p-4 text-sm font-medium text-primary">Type</th>
                      <th className="text-right p-4 text-sm font-medium text-primary">Amount</th>
                      <th className="text-center p-4 text-sm font-medium text-primary">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-primary">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingPayouts.map((payout) => (
                      <tr key={payout.id} className="border-b border-neutral-medium">
                        <td className="p-4 text-sm text-primary">{formatDate(payout.date)}</td>
                        <td className="p-4 text-sm text-secondary">{payout.projectName}</td>
                        <td className="p-4 text-sm text-primary">{payout.type}</td>
                        <td className="p-4 text-sm text-right font-medium text-success">
                          {formatCurrency(payout.amount)}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(payout.status)}`}>
                            {payout.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-secondary">{payout.description}</td>
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
            {/* Tax Summary Cards */}
            <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6">
              <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                <div className="text-accent-amber text-sm font-mono mb-2">TAXABLE INCOME</div>
                <div className="text-2xl font-bold text-primary mb-1">{formatCurrency(taxSummary.totalTaxableIncome)}</div>
                <div className="text-xs text-secondary">FY {taxSummary.currentFY}</div>
              </div>
              
              <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                <div className="text-accent-amber text-sm font-mono mb-2">TDS DEDUCTED</div>
                <div className="text-2xl font-bold text-warning mb-1">{formatCurrency(taxSummary.tdsDeducted)}</div>
                <div className="text-xs text-secondary">15% on interest income</div>
              </div>
              
              <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                <div className="text-accent-amber text-sm font-mono mb-2">TAX RATE</div>
                <div className="text-2xl font-bold text-primary mb-1">{taxSummary.applicableTaxRate}</div>
                <div className="text-xs text-secondary">Applicable slab rate</div>
              </div>
              
              <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                <div className="text-accent-amber text-sm font-mono mb-2">NET TAX PAYABLE</div>
                <div className="text-2xl font-bold text-success mb-1">{formatCurrency(taxSummary.netTaxPayable)}</div>
                <div className="text-xs text-secondary">After TDS adjustment</div>
              </div>
            </div>

            {/* Tax Details */}
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
                <div className="p-6 border-b border-neutral-medium">
                  <h3 className="text-lg font-bold text-primary">Income Breakdown</h3>
                  <p className="text-sm text-secondary">Taxable income by category</p>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-secondary">Interest Income</span>
                      <span className="text-sm font-medium text-primary">{formatCurrency(taxSummary.interestIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-secondary">Capital Gains</span>
                      <span className="text-sm font-medium text-primary">{formatCurrency(taxSummary.capitalGains)}</span>
                    </div>
                    <div className="border-t border-neutral-medium pt-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-primary">Total Taxable Income</span>
                        <span className="text-sm font-bold text-primary">{formatCurrency(taxSummary.totalTaxableIncome)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
                <div className="p-6 border-b border-neutral-medium">
                  <h3 className="text-lg font-bold text-primary">Tax Documents</h3>
                  <p className="text-sm text-secondary">Download tax-related documents</p>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium text-primary">Form 16A - TDS Certificate</div>
                        <div className="text-xs text-secondary">Interest income TDS details</div>
                      </div>
                      <Button variant="outline" size="sm">Download</Button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium text-primary">Capital Gains Statement</div>
                        <div className="text-xs text-secondary">Realized gains for FY 2024-25</div>
                      </div>
                      <Button variant="outline" size="sm">Download</Button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium text-primary">Annual Statement</div>
                        <div className="text-xs text-secondary">Complete investment summary</div>
                      </div>
                      <Button variant="outline" size="sm">Download</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}