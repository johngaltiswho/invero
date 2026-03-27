'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
// import type { InvestorProfile, Investment, Return } from '@/lib/investor-transformers';

// Define types inline for build compatibility
interface InvestorProfile {
  id?: string;
  investorName?: string;
  name?: string;
}

interface Investment {
  id: string;
  investmentAmount: number;
  investment_amount?: number;
  projectId?: string;
  project_id?: string;
  contractorId?: string;
  contractor_id?: string;
  expectedReturn?: number;
  expected_return?: number;
  investmentDate?: string;
  investment_date?: string;
  status?: string;
  [key: string]: unknown;
}

interface Return {
  id: string;
  amount: number;
  date: string;
  type: string;
}

interface InvestorTransaction {
  id: string;
  investor_id?: string;
  project_id?: string;
  contractor_id?: string;
  amount?: number;
  transaction_type?: string;
  status?: string;
  description?: string;
  reference_number?: string;
  created_at?: string;
  projects?: GenericRecord | null;
  contractors?: GenericRecord | null;
  [key: string]: unknown;
}

type GenericRecord = Record<string, unknown>;

interface PortfolioMetrics {
  totalInvested: number;
  totalReturns: number;
  currentValue: number;
  roi: number;
  netRoi: number;
  portfolioXirr?: number;
  activeInvestments: number;
  completedInvestments: number;
  totalInvestments: number;
  capitalInflow: number;
  capitalReturns: number;
  netCapitalReturns: number;
  managementFees: number;
  performanceFees: number;
  potentialPerformanceFees?: number;
  grossNavPerUnit?: number;
  netNavPerUnit?: number;
  unitsHeld?: number;
  ownershipPercent?: number;
  deployedPoolShare?: number;
  poolCashShare?: number;
  accruedParticipationIncomeShare?: number;
  preferredReturnAccruedShare?: number;
  realizedInvestorRoi?: number;
}

interface PoolPosition {
  unitsHeld: number;
  ownershipPercent: number;
  entryNavPerUnit: number;
  grossValue: number;
  netValue: number;
  grossGain: number;
  netGain: number;
  contributedCapital: number;
  shareOfPoolCash: number;
  shareOfDeployedPrincipal: number;
  shareOfAccruedParticipationIncome: number;
  shareOfPreferredReturnAccrued: number;
  shareOfManagementFeeAccrued: number;
  shareOfRealizedCarry: number;
  shareOfPotentialCarry: number;
}

interface PoolSummary {
  valuationDate: string;
  totalCommittedCapital: number;
  totalPoolUnits: number;
  grossNavPerUnit: number;
  netNavPerUnit: number;
  poolCash: number;
  deployedPrincipal: number;
  accruedParticipationIncome: number;
  realizedParticipationIncome: number;
  preferredReturnAccrued: number;
  managementFeeAccrued: number;
  realizedCarryAccrued: number;
  potentialCarry: number;
  grossPoolValue: number;
  netPoolValue: number;
  realizedXirr: number;
  projectedGrossXirr: number;
  projectedNetXirr: number;
}

interface PoolExposure extends GenericRecord {
  purchaseRequestId: string;
  projectId?: string | null;
  projectName?: string | null;
  contractorId?: string | null;
  contractorName?: string | null;
  outstandingPrincipal: number;
  outstandingParticipationFee: number;
  grossExposureValue: number;
  investorGrossExposure: number;
  investorNetExposure: number;
}

interface InvestorWithData extends InvestorProfile {
  investments: Investment[];
  transactions: InvestorTransaction[];
  returns: Return[];
  relatedContractors: GenericRecord[];
  relatedProjects: GenericRecord[];
  allContractors?: GenericRecord[];
  portfolioMetrics: PortfolioMetrics;
  poolPosition?: PoolPosition;
  poolSummary?: PoolSummary;
  poolExposure?: PoolExposure[];
  availableOpportunities: GenericRecord[];
}

interface InvestorContextType {
  investor: InvestorWithData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const InvestorContext = createContext<InvestorContextType | undefined>(undefined);

interface InvestorProviderProps {
  children: ReactNode;
}

export function InvestorProvider({ children }: InvestorProviderProps) {
  const { user, isLoaded } = useUser();
  const [investor, setInvestor] = useState<InvestorWithData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvestorData = useCallback(async () => {
    if (!user || !isLoaded) {
      setInvestor(null);
      return;
    }

    // Don't fetch if we already have investor data and no error
    if (investor && !error) {
      console.log('📦 InvestorContext: Using existing investor data');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 InvestorContext: Fetching investor data...');
      const response = await fetch('/api/investor-profile');
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Investor profile not found. Please contact support to get access.');
        }
        throw new Error(`Failed to fetch investor data: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to load investor data');
      }

      console.log('✅ InvestorContext: Investor data loaded successfully');
      setInvestor(data.investor);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ InvestorContext: Error fetching investor data:', errorMessage);
      setError(errorMessage);
      setInvestor(null);
    } finally {
      setLoading(false);
    }
  }, [user, isLoaded, investor, error]);

  const refetch = async () => {
    setInvestor(null); // Clear existing data to force refetch
    await fetchInvestorData();
  };

  useEffect(() => {
    fetchInvestorData();
  }, [fetchInvestorData]);

  const value: InvestorContextType = {
    investor,
    loading,
    error,
    refetch,
  };

  return (
    <InvestorContext.Provider value={value}>
      {children}
    </InvestorContext.Provider>
  );
}

export function useInvestor(): InvestorContextType {
  const context = useContext(InvestorContext);
  if (context === undefined) {
    throw new Error('useInvestor must be used within an InvestorProvider');
  }
  return context;
}
