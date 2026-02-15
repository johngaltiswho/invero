'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import type { ContractorWithProgress, RegistrationStep } from '@/types/contractor-access';

const PURCHASE_GATED_FEATURES = ['purchase_request', 'rfq_generation', 'po_creation'];

interface ContractorAccessInfo {
  hasAccess: boolean;
  registrationComplete: boolean;
  registrationStep: RegistrationStep;
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
  canAccessFeature: (feature: string) => boolean;
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
          registrationComplete: access.registrationComplete ?? false,
          registrationStep: access.registrationStep ?? 'not_applied',
          reason: access.reason,
          message: access.message,
          canRetry: access.canRetry,
          redirectTo: access.redirectTo
        });
        
        console.log('🔐 ContractorContext: Access status:', access.reason, access.hasAccess ? 'GRANTED' : 'DENIED');
      } else {
        setContractor(null);
        setAccessInfo({
          hasAccess: true,
          registrationComplete: false,
          registrationStep: 'not_applied',
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
        hasAccess: true,
        registrationComplete: false,
        registrationStep: 'not_applied',
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
        registrationComplete: false,
        registrationStep: 'not_applied',
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
        const info: ContractorAccessInfo = {
          hasAccess: access.hasAccess,
          registrationComplete: access.registrationComplete ?? false,
          registrationStep: access.registrationStep ?? 'not_applied',
          reason: access.reason,
          message: access.message,
          canRetry: access.canRetry,
          redirectTo: access.redirectTo
        };
        setAccessInfo(info);
        return info;
      }
    } catch {
      // fall through
    }

    const fallback: ContractorAccessInfo = {
      hasAccess: true,
      registrationComplete: false,
      registrationStep: 'not_applied',
      reason: 'error',
      message: 'Failed to check access status',
      canRetry: true
    };
    setAccessInfo(fallback);
    return fallback;
  };

  const canAccessFeature = (feature: string): boolean => {
    if (PURCHASE_GATED_FEATURES.includes(feature)) {
      return accessInfo?.registrationComplete ?? false;
    }
    return true;
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
    canAccessFeature,
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
  const { accessInfo, loading, canAccessFeature } = useContractorV2();

  if (loading) {
    return { hasAccess: false, loading: true };
  }

  if (feature) {
    return { hasAccess: canAccessFeature(feature), loading: false, reason: accessInfo?.reason };
  }

  return { hasAccess: accessInfo?.hasAccess ?? true, loading: false };
}