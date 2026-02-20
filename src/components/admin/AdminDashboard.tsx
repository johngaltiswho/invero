'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components';

interface DashboardStats {
  investors: {
    total: number;
    active: number;
    pending: number;
  };
  capital: {
    totalCommitted: number;
    availableBalance: number;
    deployedCapital: number;
    returnsPaid: number;
  };
  contractors: {
    total: number;
    approved: number;
    pending: number;
  };
  transactions: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

type InvestorRow = {
  status?: string | null;
};

type CapitalTransactionRow = {
  status?: string | null;
  transaction_type?: string | null;
  amount?: number | string | null;
  created_at?: string | null;
};

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Fetch data from multiple endpoints in parallel
      const [investorsRes, transactionsRes] = await Promise.all([
        fetch('/api/admin/investors'),
        fetch('/api/admin/capital/transactions?limit=5000')
      ]);

      const investorsData = investorsRes.ok ? await investorsRes.json() : { investors: [] };
      const transactionsData = transactionsRes.ok ? await transactionsRes.json() : { transactions: [] };

      // Calculate stats
      const investors: InvestorRow[] = investorsData.investors || [];
      const transactions: CapitalTransactionRow[] = transactionsData.transactions || [];
      const completedTransactions = transactions.filter((txn) => txn.status === 'completed');

      const totalInflow = completedTransactions
        .filter((txn) => txn.transaction_type === 'inflow')
        .reduce((sum, txn) => sum + (Number(txn.amount) || 0), 0);
      const totalDeployment = completedTransactions
        .filter((txn) => txn.transaction_type === 'deployment')
        .reduce((sum, txn) => sum + (Number(txn.amount) || 0), 0);
      const totalReturn = completedTransactions
        .filter((txn) => txn.transaction_type === 'return')
        .reduce((sum, txn) => sum + (Number(txn.amount) || 0), 0);
      const totalWithdrawal = completedTransactions
        .filter((txn) => txn.transaction_type === 'withdrawal')
        .reduce((sum, txn) => sum + (Number(txn.amount) || 0), 0);
      const netDeployed = Math.max(totalDeployment - totalReturn, 0);
      const availableBalanceFromLedger = totalInflow - totalDeployment + totalReturn - totalWithdrawal;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const dashboardStats: DashboardStats = {
        investors: {
          total: investors.length,
          active: investors.filter((inv) => inv.status === 'active').length,
          pending: investors.filter((inv) => inv.status === 'pending').length,
        },
        capital: {
          totalCommitted: totalInflow,
          availableBalance: availableBalanceFromLedger,
          deployedCapital: netDeployed,
          returnsPaid: totalReturn,
        },
        contractors: {
          total: 0, // TODO: Fetch from contractors API
          approved: 0,
          pending: 0,
        },
        transactions: {
          today: transactions.filter((txn) => txn.created_at && new Date(txn.created_at) >= today).length,
          thisWeek: transactions.filter((txn) => txn.created_at && new Date(txn.created_at) >= weekAgo).length,
          thisMonth: transactions.filter((txn) => txn.created_at && new Date(txn.created_at) >= monthAgo).length,
        }
      };

      setStats(dashboardStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-orange"></div>
        <span className="ml-3 text-secondary">Loading admin dashboard...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Admin Dashboard</h1>
        <p className="text-secondary">Manage investors, capital transactions, and contractor verification</p>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg mb-6">
          <div className="flex items-center">
            <span className="text-lg mr-2">⚠️</span>
            {error}
          </div>
        </div>
      )}

      {/* Quick Stats Overview */}
      {stats && (
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">TOTAL CAPITAL</div>
            <div className="text-2xl font-bold text-primary mb-1">
              {formatCurrency(stats.capital.totalCommitted)}
            </div>
            <div className="text-xs text-secondary">
              {stats.investors.active} active investors
            </div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">AVAILABLE BALANCE</div>
            <div className="text-2xl font-bold text-success mb-1">
              {formatCurrency(stats.capital.availableBalance)}
            </div>
            <div className="text-xs text-secondary">Ready for deployment</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">DEPLOYED CAPITAL</div>
            <div className="text-2xl font-bold text-accent-blue mb-1">
              {formatCurrency(stats.capital.deployedCapital)}
            </div>
            <div className="text-xs text-secondary">In active projects</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">RETURNS PAID</div>
            <div className="text-2xl font-bold text-accent-amber mb-1">
              {formatCurrency(stats.capital.returnsPaid)}
            </div>
            <div className="text-xs text-secondary">To date</div>
          </div>
        </div>
      )}

      {/* Admin Modules */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Capital Management */}
        <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
          <div className="p-6 border-b border-neutral-medium">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-primary">Capital Management</h3>
                <p className="text-sm text-secondary">Track investor capital flows and deployments</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-3 mb-6">
              {stats && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Transactions today:</span>
                    <span className="text-primary font-medium">{stats.transactions.today}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">This week:</span>
                    <span className="text-primary font-medium">{stats.transactions.thisWeek}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">This month:</span>
                    <span className="text-primary font-medium">{stats.transactions.thisMonth}</span>
                  </div>
                </>
              )}
            </div>
            
            <Link href="/admin/capital">
              <Button variant="primary" className="w-full">
                Manage Capital Transactions
              </Button>
            </Link>
          </div>
        </div>

        {/* Investor Management */}
        <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
          <div className="p-6 border-b border-neutral-medium">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-accent-blue/10 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">👥</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-primary">Investor Management</h3>
                <p className="text-sm text-secondary">Manage investor accounts and permissions</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-3 mb-6">
              {stats && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Total investors:</span>
                    <span className="text-primary font-medium">{stats.investors.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Active:</span>
                    <span className="text-success font-medium">{stats.investors.active}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Pending approval:</span>
                    <span className="text-accent-amber font-medium">{stats.investors.pending}</span>
                  </div>
                </>
              )}
            </div>
            
            <Link href="/admin/investors">
              <Button variant="primary" className="w-full">
                Manage Investors
              </Button>
            </Link>
          </div>
        </div>

        {/* Contractor Verification */}
        <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
          <div className="p-6 border-b border-neutral-medium">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-accent-amber/10 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">🔧</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-primary">Contractor Verification</h3>
                <p className="text-sm text-secondary">Review contractor documents and BOQ submissions</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Pending verifications:</span>
                <span className="text-accent-amber font-medium">-</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Material requests:</span>
                <span className="text-primary font-medium">-</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-secondary">BOQ submissions:</span>
                <span className="text-primary font-medium">-</span>
              </div>
            </div>
            
            <Link href="/admin/verification">
              <Button variant="primary" className="w-full">
                Review Contractors
              </Button>
            </Link>
          </div>
        </div>

        {/* Finance Dashboard */}
        <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
          <div className="p-6 border-b border-neutral-medium">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-accent-blue/10 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">📉</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-primary">Finance Dashboard</h3>
                <p className="text-sm text-secondary">Track funding, repayments, and exposure</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-3 mb-6 text-sm text-secondary">
              <div className="flex justify-between">
                <span>Total funding required:</span>
                <span className="text-primary font-medium">See finance view</span>
              </div>
              <div className="flex justify-between">
                <span>Outstanding exposure:</span>
                <span className="text-primary font-medium">See finance view</span>
              </div>
            </div>

            <Link href="/admin/finance">
              <Button variant="primary" className="w-full">
                Open Finance Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
          <div className="p-6 border-b border-neutral-medium">
            <h3 className="text-xl font-semibold text-primary">Quick Actions</h3>
            <p className="text-sm text-secondary">Common administrative tasks</p>
          </div>
          
          <div className="p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/admin/investors" className="group">
                <div className="bg-neutral-medium/20 hover:bg-neutral-medium/40 p-4 rounded-lg transition-colors">
                  <div className="text-lg mb-2">➕</div>
                  <div className="text-sm font-medium text-primary group-hover:text-accent-orange">
                    Add New Investor
                  </div>
                </div>
              </Link>
              
              <Link href="/admin/capital" className="group">
                <div className="bg-neutral-medium/20 hover:bg-neutral-medium/40 p-4 rounded-lg transition-colors">
                  <div className="text-lg mb-2">💸</div>
                  <div className="text-sm font-medium text-primary group-hover:text-accent-orange">
                    Record Capital Inflow
                  </div>
                </div>
              </Link>
              
              <Link href="/admin/capital" className="group">
                <div className="bg-neutral-medium/20 hover:bg-neutral-medium/40 p-4 rounded-lg transition-colors">
                  <div className="text-lg mb-2">🚀</div>
                  <div className="text-sm font-medium text-primary group-hover:text-accent-orange">
                    Deploy Capital
                  </div>
                </div>
              </Link>
              
              <Link href="/admin/verification" className="group">
                <div className="bg-neutral-medium/20 hover:bg-neutral-medium/40 p-4 rounded-lg transition-colors">
                  <div className="text-lg mb-2">✅</div>
                  <div className="text-sm font-medium text-primary group-hover:text-accent-orange">
                    Review Documents
                  </div>
                </div>
              </Link>

              <Link href="/admin/finance" className="group">
                <div className="bg-neutral-medium/20 hover:bg-neutral-medium/40 p-4 rounded-lg transition-colors">
                  <div className="text-lg mb-2">📈</div>
                  <div className="text-sm font-medium text-primary group-hover:text-accent-orange">
                    Finance Overview
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
