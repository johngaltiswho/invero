'use client';

import React, { useEffect, useState } from 'react';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';
import { LoadingSpinner } from '@/components';
import ContractorAgreementStatusCard, {
  type ContractorAgreementCardData,
  type ContractorAgreementCardFiles,
} from '@/components/contractor/ContractorAgreementStatusCard';
import { useUser } from '@clerk/nextjs';
import { usePathname, useRouter } from 'next/navigation';

type AgreementResponse = {
  agreements: Array<{
    agreement: ContractorAgreementCardData;
    files: ContractorAgreementCardFiles;
  }>;
};

export default function ContractorAgreementPage(): React.ReactElement {
  const { isLoaded, user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<AgreementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.replace(`/sign-in?redirect_url=${encodeURIComponent(pathname || '/dashboard/contractor/agreement')}`);
    }
  }, [isLoaded, user, router, pathname]);

  const load = async () => {
    try {
      setLoading(true);
      setAuthError(null);
      const response = await fetch('/api/contractor/agreement');
      const result = await response.json();
      if (response.status === 401) {
        router.replace(`/sign-in?redirect_url=${encodeURIComponent(pathname || '/dashboard/contractor/agreement')}`);
        return;
      }
      if (response.status === 404) {
        setAuthError('This agreement link belongs to a different contractor account. Sign in with the invited company email address to continue.');
        setData({ agreements: [] });
        return;
      }
      if (response.ok && result.success) {
        setData({
          agreements: result.agreements || [],
        });
      } else {
        setAuthError(result?.error || 'Unable to load agreement details.');
        setData({ agreements: [] });
      }
    } catch (error) {
      console.error('Failed to load contractor agreement:', error);
      setAuthError('Unable to load agreement details right now.');
      setData({ agreements: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded || !user) return;
    load();
  }, [isLoaded, user]);

  if (!isLoaded || (!user && loading)) {
    return (
      <ContractorDashboardLayout activeTab="agreement">
        <div className="p-6">
          <LoadingSpinner
            title="Checking Access"
            description="Verifying your sign-in session before opening the agreement"
            icon="🔐"
            fullScreen={false}
            steps={['Checking authentication...', 'Opening agreement link...']}
          />
        </div>
      </ContractorDashboardLayout>
    );
  }

  return (
    <ContractorDashboardLayout activeTab="agreement">
      <div className="p-6">
        {loading ? (
          <LoadingSpinner
            title="Loading Agreement"
            description="Fetching your contractor agreement details"
            icon="📄"
            fullScreen={false}
            steps={['Verifying access...', 'Fetching agreement...', 'Preparing secure links...']}
          />
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2">Agreement</h1>
              <p className="text-secondary">View and sign each Finverno agreement issued to your company.</p>
            </div>

            {authError && (
              <div className="rounded-lg border border-accent-amber/20 bg-accent-amber/5 p-4 text-sm text-secondary">
                {authError}
              </div>
            )}

            {data?.agreements?.length ? (
              data.agreements.map(({ agreement, files }) => (
                <ContractorAgreementStatusCard
                  key={agreement.id}
                  agreement={agreement}
                  files={files}
                  onSigned={load}
                />
              ))
            ) : (
              <ContractorAgreementStatusCard agreement={null} files={{}} onSigned={load} />
            )}
          </div>
        )}
      </div>
    </ContractorDashboardLayout>
  );
}
