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

type GenericRecord = Record<string, unknown>;

interface PortfolioMetrics {
  totalInvested: number;
  totalReturns: number;
  currentValue: number;
  roi: number;
  netRoi: number;
  activeInvestments: number;
  completedInvestments: number;
  totalInvestments: number;
  capitalInflow: number;
  capitalReturns: number;
  netCapitalReturns: number;
  managementFees: number;
  performanceFees: number;
}

interface InvestorWithData extends InvestorProfile {
  investments: Investment[];
  returns: Return[];
  relatedContractors: GenericRecord[];
  relatedProjects: GenericRecord[];
  allContractors?: GenericRecord[];
  portfolioMetrics: PortfolioMetrics;
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
