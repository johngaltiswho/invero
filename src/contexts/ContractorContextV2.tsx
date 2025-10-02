'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import type { ContractorWithProgress } from '@/types/contractor-access';

interface ContractorAccessInfo {
  hasAccess: boolean;
  reason: string;
  message: string;
  canRetry: boolean;
  redirectTo?: string;
}

interface ContractorContextType {
  contractor: ContractorWithProgress | null;
  loading: boolean;
  error: string | null;
  accessInfo: ContractorAccessInfo | null;
  refetch: () => Promise<void>;
  checkAccess: () => Promise<ContractorAccessInfo>;
}

const ContractorContext = createContext<ContractorContextType | undefined>(undefined);

interface ContractorProviderProps {
  children: ReactNode;
}

export function ContractorProvider({ children }: ContractorProviderProps) {
  const { user, isLoaded } = useUser();
  const [contractor, setContractor] = useState<ContractorWithProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessInfo, setAccessInfo] = useState<ContractorAccessInfo | null>(null);

  const fetchContractorData = async () => {
    if (!user || !isLoaded) {
      setContractor(null);
      setAccessInfo(null);
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
      console.log('🔍 ContractorContext: Fetching contractor data from Supabase');
      
      // Check access status via API
      const response = await fetch('/api/contractor-access');
      const data = await response.json();
      
      if (data.success) {
        const access = data.data;
        
        // Set contractor data if available
        if (access.contractor) {
          setContractor(access.contractor as ContractorWithProgress);
          console.log('✅ ContractorContext: Contractor data loaded:', access.contractor.company_name);
        }
        
        // Set access info
        setAccessInfo({
          hasAccess: access.hasAccess,
          reason: access.reason,
          message: access.message,
          canRetry: access.canRetry,
          redirectTo: access.redirectTo
        });
        
        console.log('🔐 ContractorContext: Access status:', access.reason, access.hasAccess ? 'GRANTED' : 'DENIED');
      } else {
        setContractor(null);
        setAccessInfo({
          hasAccess: false,
          reason: 'not_found',
          message: 'No contractor application found',
          canRetry: true,
          redirectTo: '/contractors/apply'
        });
        console.log('ℹ️ ContractorContext: No contractor found for user');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load contractor data';
      setError(errorMessage);
      setContractor(null);
      setAccessInfo({
        hasAccess: false,
        reason: 'error',
        message: errorMessage,
        canRetry: true
      });
      console.error('❌ ContractorContext: Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkAccess = async (): Promise<ContractorAccessInfo> => {
    if (!user) {
      return {
        hasAccess: false,
        reason: 'not_authenticated',
        message: 'Please log in to continue',
        canRetry: false,
        redirectTo: '/sign-in'
      };
    }

    try {
      const response = await fetch('/api/contractor-access');
      const data = await response.json();
      
      if (data.success) {
        const access = data.data;
        const accessInfo = {
          hasAccess: access.hasAccess,
          reason: access.reason,
          message: access.message,
          canRetry: access.canRetry,
          redirectTo: access.redirectTo
        };
        
        setAccessInfo(accessInfo);
        return accessInfo;
      }
    } catch (error) {
      const accessInfo = {
        hasAccess: false,
        reason: 'error',
        message: 'Failed to check access status',
        canRetry: true
      };
      setAccessInfo(accessInfo);
      return accessInfo;
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
    accessInfo,
    refetch: fetchContractorData,
    checkAccess,
  };

  return (
    <ContractorContext.Provider value={contextValue}>
      {children}
    </ContractorContext.Provider>
  );
}

export function useContractorV2() {
  const context = useContext(ContractorContext);
  if (context === undefined) {
    throw new Error('useContractorV2 must be used within a ContractorProvider');
  }
  return context;
}

// Hook for checking if contractor has access to specific features
export function useContractorAccess(feature?: string) {
  const { contractor, accessInfo, loading } = useContractorV2();
  
  if (loading || !contractor || !accessInfo) {
    return { hasAccess: false, loading: true };
  }

  if (!accessInfo.hasAccess) {
    return { hasAccess: false, loading: false, reason: accessInfo.reason };
  }

  if (feature && contractor) {
    // For now, assume all features are accessible if contractor has dashboard access
    return { hasAccess: true, loading: false };
  }

  return { hasAccess: true, loading: false };
}