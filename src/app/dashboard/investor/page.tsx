'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useInvestor } from '@/contexts/InvestorContext';

export default function InvestorDashboard(): React.ReactElement {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { investor, loading: investorLoading, error } = useInvestor();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoaded) return;
    
    if (!user) {
      router.push('/sign-in');
      return;
    }
  }, [user, isLoaded, router]);

  // Show loading state while Clerk loads OR investor data loads
  if (!isLoaded || investorLoading) {
    return (
      <div className="min-h-screen bg-neutral-darker flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔄</div>
          <h2 className="text-xl font-bold text-primary mb-2">Loading...</h2>
          <p className="text-secondary">
            {!isLoaded ? 'Authenticating your access' : 'Loading investor data from Google Sheets'}
          </p>
        </div>
      </div>
    );
  }
  
  // If there's an error, show error state
  if (error && !investor && !investorLoading) {
    return (
      <div className="min-h-screen bg-neutral-darker flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-primary mb-2">Access Denied</h2>
          <p className="text-secondary mb-4">
            Your email is not registered as an investor in our system.
          </p>
          <p className="text-xs text-secondary mb-4">{error}</p>
          <div className="space-x-4">
            <button onClick={() => window.location.href = '/sign-in'} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm">
              Back to Login
            </button>
            <button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // If no investor found after loading, show access denied
  if (!investor && !investorLoading) {
    return (
      <div className="min-h-screen bg-neutral-darker flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-primary mb-2">Access Not Found</h2>
          <p className="text-secondary mb-4">
            No investor account found for your email address.
          </p>
          <p className="text-secondary mb-4">
            Please contact the administrator to get access to the investor portal.
          </p>
          <button onClick={() => window.location.href = '/sign-in'} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Use Google Sheets data
  const portfolioMetrics = investor?.portfolioMetrics || {
    totalInvested: 0,
    totalReturns: 0,
    currentValue: 0,
    roi: 0,
    activeInvestments: 0,
    completedInvestments: 0,
    totalInvestments: 0
  };

  const recentInvestments = investor?.investments?.slice(0, 5) || [];

  // Calculate sector allocation from investments
  const sectorData: { [key: string]: number } = {};
  investor?.relatedContractors?.forEach(contractor => {
    const contractorInvestments = investor.investments.filter(inv => inv.contractorId === contractor.id);
    const contractorTotal = contractorInvestments.reduce((sum, inv) => sum + inv.investmentAmount, 0);
    
    if (contractor.businessCategory) {
      sectorData[contractor.businessCategory] = (sectorData[contractor.businessCategory] || 0) + contractorTotal;
    }
  });

  const sectorAllocation = Object.entries(sectorData).map(([sector, amount]) => ({
    sector,
    amount,
    percentage: portfolioMetrics.totalInvested > 0 ? Math.round((amount / portfolioMetrics.totalInvested) * 100) : 0
  })).sort((a, b) => b.amount - a.amount);

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <DashboardLayout activeTab="overview">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Portfolio Overview</h1>
          <p className="text-secondary mb-4">
            Welcome back, {investor?.investorName}! Real-time insights into your project financing investments
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">TOTAL INVESTED</div>
            <div className="text-2xl font-bold text-primary mb-1">{formatCurrency(portfolioMetrics.totalInvested)}</div>
            <div className="text-xs text-secondary">Across {portfolioMetrics.totalInvestments} investments</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">CURRENT VALUE</div>
            <div className="text-2xl font-bold text-primary mb-1">{formatCurrency(portfolioMetrics.currentValue)}</div>
            <div className="text-xs text-success">+{formatCurrency(portfolioMetrics.totalReturns)} returns</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">CURRENT ROI</div>
            <div className="text-2xl font-bold text-accent-amber mb-1">{portfolioMetrics.roi.toFixed(1)}%</div>
            <div className="text-xs text-secondary">Return on investment</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">ACTIVE INVESTMENTS</div>
            <div className="text-2xl font-bold text-primary mb-1">{portfolioMetrics.activeInvestments}</div>
            <div className="text-xs text-secondary">{portfolioMetrics.completedInvestments} completed</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Investments */}
          <div className="lg:col-span-2">
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="p-6 border-b border-neutral-medium">
                <h2 className="text-xl font-bold text-primary">Recent Investments</h2>
                <p className="text-sm text-secondary">Your latest project financing activities</p>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  {recentInvestments.length > 0 ? recentInvestments.map((investment) => {
                    // Find related contractor and project
                    const contractor = investor?.relatedContractors?.find(c => c.id === investment.contractorId);
                    const project = investor?.relatedProjects?.find(p => p.id === investment.projectId);
                    
                    return (
                    <div key={investment.id} className="border border-neutral-medium rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-primary mb-1">
                            {project?.projectName || `Project ${investment.projectId}`}
                          </h3>
                          <p className="text-sm text-secondary">
                            {contractor?.companyName || `Contractor ${investment.contractorId}`}
                          </p>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          investment.status === 'Active' 
                            ? 'bg-accent-blue/10 text-accent-blue'
                            : investment.status === 'Completed'
                            ? 'bg-success/10 text-success'
                            : 'bg-error/10 text-error'
                        }`}>
                          {investment.status}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <div className="text-xs text-secondary">Investment</div>
                          <div className="font-semibold text-primary">{formatCurrency(investment.investmentAmount)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-secondary">Expected Return</div>
                          <div className="font-semibold text-accent-amber">{investment.expectedReturn.toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-xs text-secondary">Date</div>
                          <div className="font-semibold text-primary">{formatDate(investment.investmentDate)}</div>
                        </div>
                      </div>
                      
                      {investment.actualReturn !== undefined && (
                        <div className="text-xs text-success">
                          Actual Return: {investment.actualReturn.toFixed(1)}%
                        </div>
                      )}
                    </div>
                    );
                  }) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">💰</div>
                      <h3 className="text-lg font-semibold text-primary mb-2">No Investments Yet</h3>
                      <p className="text-secondary">
                        No investments found. Make sure your Investments sheet has data and your email matches the investorEmail column.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sector Allocation */}
          <div>
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="p-6 border-b border-neutral-medium">
                <h2 className="text-xl font-bold text-primary">Sector Allocation</h2>
                <p className="text-sm text-secondary">Portfolio distribution by industry</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {sectorAllocation.map((sector, index) => (
                    <div key={sector.sector}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-primary">{sector.sector}</span>
                        <span className="text-sm text-accent-amber">{sector.percentage}%</span>
                      </div>
                      <div className="w-full bg-neutral-medium rounded-full h-2 mb-1">
                        <div 
                          className="bg-accent-amber h-2 rounded-full" 
                          style={{ width: `${sector.percentage}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-secondary">{sector.amount}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium mt-6">
              <div className="p-6">
                <h3 className="text-lg font-bold text-primary mb-4">Performance Highlights</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary">Best Performing Sector</span>
                    <span className="text-sm text-success">IT Services (15.1%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary">Average Project Duration</span>
                    <span className="text-sm text-primary">6.2 months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary">Success Rate</span>
                    <span className="text-sm text-success">97.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary">Next Payment</span>
                    <span className="text-sm text-accent-amber">Dec 15, 2024</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}