'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { LoadingSpinner, AddCapitalModal } from '@/components';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useInvestor } from '@/contexts/InvestorContext';
import InvestorAgreementStatusCard from '@/components/investor/InvestorAgreementStatusCard';

export default function InvestorDashboard(): React.ReactElement {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { investor, loading: investorLoading, error } = useInvestor();
  const [isAddCapitalModalOpen, setIsAddCapitalModalOpen] = useState(false);
  const [agreementData, setAgreementData] = useState<{ agreement: any; files: any } | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoaded) return;
    
    if (!user) {
      router.push('/sign-in');
      return;
    }
  }, [user, isLoaded, router]);

  useEffect(() => {
    if (!user || !isLoaded) return;

    const loadAgreement = async () => {
      try {
        const response = await fetch('/api/investor/agreement');
        const result = await response.json();
        if (response.ok && result.success) {
          setAgreementData({ agreement: result.agreement, files: result.files || {} });
        }
      } catch (error) {
        console.error('Failed to load investor agreement status:', error);
      }
    };

    loadAgreement();
  }, [user, isLoaded]);

  // Show loading state while Clerk loads OR investor data loads
  if (!isLoaded || investorLoading) {
    return (
      <div className="min-h-screen bg-neutral-darker">
        <LoadingSpinner 
          title={!isLoaded ? "Authenticating Access" : "Loading Dashboard"}
          description={!isLoaded ? 
            "Verifying your credentials and setting up your secure session" : 
            "Fetching your investor profile and portfolio data from secure servers"
          }
          icon="🔐"
          fullScreen={true}
          steps={!isLoaded ? [
            "Verifying user credentials...",
            "Establishing secure session...",
            "Preparing dashboard access..."
          ] : [
            "Loading investor profile...",
            "Fetching portfolio data...",
            "Synchronizing portfolio insights..."
          ]}
        />
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
    netRoi: 0,
    portfolioXirr: 0,
    activeInvestments: 0,
    completedInvestments: 0,
    totalInvestments: 0,
    capitalInflow: 0,
    capitalReturns: 0,
    netCapitalReturns: 0,
    managementFees: 0,
    performanceFees: 0,
    potentialPerformanceFees: 0,
    grossNavPerUnit: 100,
    netNavPerUnit: 100,
    unitsHeld: 0,
    ownershipPercent: 0,
    deployedPoolShare: 0,
    poolCashShare: 0,
    accruedParticipationIncomeShare: 0,
    preferredReturnAccruedShare: 0,
    realizedInvestorRoi: 0
  };
  const poolSummary = investor?.poolSummary || {
    grossPoolValue: 0,
    netPoolValue: 0,
    grossNavPerUnit: 100,
    netNavPerUnit: 100,
    projectedGrossXirr: 0,
    projectedNetXirr: 0,
    realizedXirr: 0,
    totalPoolUnits: 0,
    poolCash: 0,
    deployedPrincipal: 0,
    accruedParticipationIncome: 0,
    managementFeeAccrued: 0,
    preferredReturnAccrued: 0,
    realizedCarryAccrued: 0,
    potentialCarry: 0,
    valuationDate: new Date().toISOString()
  };
  const poolPosition = investor?.poolPosition || {
    unitsHeld: 0,
    ownershipPercent: 0,
    entryNavPerUnit: 100,
    grossValue: 0,
    netValue: 0,
    grossGain: 0,
    netGain: 0,
    contributedCapital: 0,
    shareOfPoolCash: 0,
    shareOfDeployedPrincipal: 0,
    shareOfAccruedParticipationIncome: 0,
    shareOfPreferredReturnAccrued: 0,
    shareOfManagementFeeAccrued: 0,
    shareOfRealizedCarry: 0,
    shareOfPotentialCarry: 0
  };

  const poolExposure = investor?.poolExposure || [];

  // Calculate sector allocation from investments
  const sectorData: { [key: string]: number } = {};
  investor?.relatedContractors?.forEach(contractor => {
    const contractorInvestments = investor.investments.filter(inv => inv.contractorId === contractor.id);
    const contractorTotal = contractorInvestments.reduce((sum, inv) => sum + inv.investmentAmount, 0);
    
    if (contractor.businessCategory) {
      const category = String(contractor.businessCategory);
      sectorData[category] = (sectorData[category] || 0) + contractorTotal;
    }
  });

  const sectorAllocation = Object.entries(sectorData).map(([sector, amount]) => ({
    sector,
    amount,
    percentage: portfolioMetrics.totalInvested > 0 ? Math.round((amount / portfolioMetrics.totalInvested) * 100) : 0
  })).sort((a, b) => b.amount - a.amount);
  const showPortfolioInsights = false;

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
    if (!dateString || dateString.trim() === '') {
      return 'Date not set';
    }

    try {
      let date: Date;
      
      if (!isNaN(Number(dateString))) {
        // Handle Excel serial number dates
        const excelDate = Number(dateString);
        if (excelDate > 25569) {
          date = new Date((excelDate - 25569) * 86400 * 1000);
        } else {
          date = new Date(excelDate);
        }
      } else {
        // Handle DD/MM/YYYY format (common in Indian data)
        if (dateString.includes('/')) {
          const parts = dateString.split('/');
          if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1; // Month is 0-indexed
            const year = parseInt(parts[2]);
            date = new Date(year, month, day);
          } else {
            date = new Date(dateString);
          }
        } else {
          // Try ISO format or other standard formats
          date = new Date(dateString);
        }
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }

      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.warn('Error formatting date:', dateString, error);
      return 'Invalid date';
    }
  };

  type InvestmentRecord = Record<string, unknown>;

  const getInvestmentValue = (investment: InvestmentRecord, fields: string[], fallback?: unknown) => {
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(investment, field)) {
        const value = investment[field];
        if (value !== undefined && value !== null && value !== '') {
          return value;
        }
      }
    }
    return fallback;
  };

  return (
    <DashboardLayout activeTab="overview">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">Portfolio Overview</h1>
              <p className="text-secondary">
                Welcome back, {(investor as any)?.investorName || (investor as any)?.name || 'Investor'}! Real-time insights into your project financing investments
              </p>
            </div>
            <button
              onClick={() => setIsAddCapitalModalOpen(true)}
              className="bg-accent-amber hover:bg-accent-amber/90 text-neutral-darker font-semibold px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Capital
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-4 mb-8">
          <div className="bg-neutral-dark p-4 sm:p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">CAPITAL COMMITTED</div>
            <div className="text-2xl font-bold text-primary mb-1">{formatCurrency(poolPosition.contributedCapital)}</div>
            <div className="text-xs text-secondary">
              Pool ownership: {poolPosition.ownershipPercent.toFixed(2)}%
            </div>
          </div>
          <div className="bg-neutral-dark p-4 sm:p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">POOL UNITS HELD</div>
            <div className="text-2xl font-bold text-primary mb-1">{poolPosition.unitsHeld.toFixed(4)}</div>
            <div className="text-xs text-secondary">Entry NAV: ₹{poolPosition.entryNavPerUnit.toFixed(4)}</div>
          </div>
          
          <div className="bg-neutral-dark p-4 sm:p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">CURRENT NET NAV</div>
            <div className="text-2xl font-bold text-primary mb-1">₹{poolSummary.netNavPerUnit.toFixed(4)}</div>
            <div className="text-xs text-secondary">Gross NAV: ₹{poolSummary.grossNavPerUnit.toFixed(4)}</div>
          </div>
          
          <div className="bg-neutral-dark p-4 sm:p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">CURRENT NET VALUE</div>
            <div className="text-2xl font-bold text-primary mb-1">{formatCurrency(poolPosition.netValue)}</div>
            <div className="text-xs text-success">Gross value: {formatCurrency(poolPosition.grossValue)}</div>
          </div>
          
          <div className="bg-neutral-dark p-4 sm:p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">PROJECTED GROSS XIRR</div>
            <div className="text-2xl font-bold text-accent-amber mb-1">
              {Number.isFinite(poolSummary.projectedGrossXirr) ? poolSummary.projectedGrossXirr.toFixed(1) : '0.0'}%
            </div>
            <div className="text-xs text-secondary">Based on current pool value and accrued income</div>
          </div>

          <div className="bg-neutral-dark p-4 sm:p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">PROJECTED NET XIRR</div>
            <div className="text-2xl font-bold text-accent-amber mb-1">
              {Number.isFinite(poolSummary.projectedNetXirr) ? Number(poolSummary.projectedNetXirr).toFixed(1) : '0.0'}%
            </div>
            <div className="text-xs text-secondary">After accrued 2% management fee only</div>
          </div>
          
          <div className="bg-neutral-dark p-4 sm:p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">YOUR DEPLOYED POOL SHARE</div>
            <div className="text-2xl font-bold text-primary mb-1">
              {formatCurrency(poolPosition.shareOfDeployedPrincipal)}
            </div>
            <div className="text-xs text-secondary">
              Cash awaiting deployment: {formatCurrency(poolPosition.shareOfPoolCash)}
            </div>
          </div>
          
          <div className="bg-neutral-dark p-4 sm:p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">YOUR 2% / 20 IMPACT</div>
            <div className="text-2xl font-bold text-accent-amber mb-1">
              {formatCurrency(poolPosition.shareOfManagementFeeAccrued + poolPosition.shareOfRealizedCarry)}
            </div>
            <div className="text-xs text-secondary">
              Mgmt accrued: {formatCurrency(poolPosition.shareOfManagementFeeAccrued)} • Realized carry: {formatCurrency(poolPosition.shareOfRealizedCarry)}
            </div>
          </div>
          
          <div className="bg-neutral-dark p-4 sm:p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">POTENTIAL CARRY</div>
            <div className="text-2xl font-bold text-primary mb-1">{formatCurrency(poolPosition.shareOfPotentialCarry)}</div>
            <div className="text-xs text-secondary">Shown for transparency only. Not deducted until realized.</div>
          </div>
        </div>

        <div className="mb-8">
          <InvestorAgreementStatusCard agreement={agreementData?.agreement || null} files={agreementData?.files || {}} />
        </div>

        <div className={`grid gap-8 ${showPortfolioInsights ? 'lg:grid-cols-3' : ''}`}>
          {/* Pool Exposure */}
          <div className={showPortfolioInsights ? 'lg:col-span-2' : ''}>
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="p-6 border-b border-neutral-medium">
                <h2 className="text-xl font-bold text-primary">Current Pool Exposure</h2>
                <p className="text-sm text-secondary">Informational look-through into the transactions your pool units are currently exposed to</p>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  {poolExposure.length > 0 ? poolExposure.map((exposure) => {
                    return (
                    <div key={exposure.purchaseRequestId} className="border border-neutral-medium rounded-lg p-4 sm:p-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-primary mb-1">
                            {exposure.projectName || 'Unmapped Project'}
                          </h3>
                          <p className="text-sm text-secondary">
                            {exposure.contractorName || 'Unknown Contractor'}
                          </p>
                        </div>
                        <div className="px-2 py-1 rounded text-xs font-medium bg-accent-blue/10 text-accent-blue">
                          PR {exposure.purchaseRequestId.slice(0, 8).toUpperCase()}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                        <div>
                          <div className="text-xs text-secondary">Your Gross Exposure</div>
                          <div className="font-semibold text-primary">{formatCurrency(exposure.investorGrossExposure)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-secondary">Outstanding Principal</div>
                          <div className="font-semibold text-primary">{formatCurrency(exposure.outstandingPrincipal)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-secondary">Accrued Participation Income</div>
                          <div className="font-semibold text-accent-amber">{formatCurrency(exposure.outstandingParticipationFee)}</div>
                        </div>
                      </div>
                      
                      <div className="text-xs text-secondary">
                        This is a look-through exposure view. Your legal ownership is in the pool units, not directly in this PR.
                      </div>
                    </div>
                    );
                  }) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">💰</div>
                      <h3 className="text-lg font-semibold text-primary mb-2">No Active Pool Exposure</h3>
                      <p className="text-secondary">
                        Your capital is either not yet deployed or the pool has no active purchase request exposure at the moment.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sector Allocation */}
          {showPortfolioInsights && (
          <div>
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="p-6 border-b border-neutral-medium">
                <h2 className="text-xl font-bold text-primary">Sector Allocation</h2>
                <p className="text-sm text-secondary">Portfolio distribution by industry</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {sectorAllocation.map((sector) => (
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
          )}
        </div>
      </div>

      <AddCapitalModal
        isOpen={isAddCapitalModalOpen}
        onClose={() => setIsAddCapitalModalOpen(false)}
      />
    </DashboardLayout>
  );
}
