'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import type { Contractor } from '@/types/contractor';

interface ContractorContextType {
  contractor: Contractor | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const ContractorContext = createContext<ContractorContextType | undefined>(undefined);

interface ContractorProviderProps {
  children: ReactNode;
}

export function ContractorProvider({ children }: ContractorProviderProps) {
  const { user, isLoaded } = useUser();
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContractorData = async () => {
    if (!user || !isLoaded) {
      setContractor(null);
      return;
    }

    // Don't fetch if we already have contractor data and no error
    if (contractor && !error) {
      console.log('📦 ContractorContext: Using existing contractor data');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 ContractorContext: Fetching contractor data via API');
      
      const response = await fetch('/api/contractor-profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setContractor(data.contractor);
        console.log('✅ ContractorContext: Contractor data loaded:', data.contractor.companyName);
      } else {
        setContractor(null);
        if (response.status === 404) {
          console.log('ℹ️ ContractorContext: No contractor found for user');
        } else {
          setError(data.message || data.error || 'Failed to load contractor data');
          console.error('❌ ContractorContext: API error:', data);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load contractor data';
      setError(errorMessage);
      setContractor(null);
      console.error('❌ ContractorContext: Network error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load contractor data when user changes
  useEffect(() => {
    fetchContractorData();
  }, [user, isLoaded]);

  const contextValue: ContractorContextType = {
    contractor,
    loading,
    error,
    refetch: fetchContractorData,
  };

  return (
    <ContractorContext.Provider value={contextValue}>
      {children}
    </ContractorContext.Provider>
  );
}

export function useContractor() {
  const context = useContext(ContractorContext);
  if (context === undefined) {
    throw new Error('useContractor must be used within a ContractorProvider');
  }
  return context;
}