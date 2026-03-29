'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { LoadingSpinner } from '@/components';
import InvestorAgreementStatusCard from '@/components/investor/InvestorAgreementStatusCard';
import { useUser } from '@clerk/nextjs';
import { usePathname, useRouter } from 'next/navigation';

type AgreementResponse = {
  agreements: any[];
};

export default function InvestorAgreementPage(): React.ReactElement {
  const { isLoaded, user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<AgreementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeAgreementId, setActiveAgreementId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.replace(`/sign-in?redirect_url=${encodeURIComponent(pathname || '/dashboard/investor/agreement')}`);
    }
  }, [isLoaded, user, router, pathname]);

  const load = async () => {
    try {
      setLoading(true);
      setAuthError(null);
      const response = await fetch('/api/investor/agreement');
      const result = await response.json();
      if (response.status === 401) {
        router.replace(`/sign-in?redirect_url=${encodeURIComponent(pathname || '/dashboard/investor/agreement')}`);
        return;
      }
      if (response.status === 404) {
        setAuthError('This agreement link belongs to a different investor account. Sign in with the invited email address to continue.');
        setData({ agreements: [] });
        return;
      }
      if (response.ok && result.success) {
        const agreements = result.agreements || [];
        setData({ agreements });
        setActiveAgreementId((current) => current && agreements.some((agreement: any) => agreement.id === current)
          ? current
          : agreements[0]?.id || null);
      } else {
        setAuthError(result?.error || 'Unable to load agreement details.');
        setData({ agreements: [] });
      }
    } catch (error) {
      console.error('Failed to load investor agreement:', error);
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
      <DashboardLayout activeTab="agreement">
        <div className="p-6">
          <LoadingSpinner
            title="Checking Access"
            description="Verifying your sign-in session before opening the agreement"
            icon="🔐"
            fullScreen={false}
            steps={['Checking authentication...', 'Opening agreement link...']}
          />
        </div>
      </DashboardLayout>
    );
  }

  const agreements = data?.agreements || [];
  const activeAgreement =
    agreements.find((agreement: any) => agreement.id === activeAgreementId) ||
    agreements[0] ||
    null;

  const getAgreementLabel = (agreement: any) =>
    agreement?.agreement_model_type === 'fixed_debt' ? 'Fixed Income' : 'Pool Participation';

  return (
    <DashboardLayout activeTab="agreement">
      <div className="p-6">
        {loading ? (
          <LoadingSpinner
            title="Loading Agreement"
            description="Fetching your investor agreement details"
            icon="📄"
            fullScreen={false}
            steps={['Verifying access...', 'Fetching agreement...', 'Preparing secure links...']}
          />
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2">Agreement</h1>
              <p className="text-secondary">View the draft, signed, and executed versions of your Finverno agreement.</p>
            </div>

            {authError && (
              <div className="rounded-lg border border-accent-amber/20 bg-accent-amber/5 p-4 text-sm text-secondary">
                {authError}
              </div>
            )}

            {!!agreements.length && (
              <div className="flex flex-wrap gap-3">
                {agreements.map((agreement: any) => {
                  const isActive = agreement.id === activeAgreement?.id;
                  return (
                    <button
                      key={agreement.id}
                      type="button"
                      onClick={() => setActiveAgreementId(agreement.id)}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'border-accent-amber bg-accent-amber/10 text-accent-amber'
                          : 'border-neutral-medium bg-neutral-dark text-secondary hover:border-accent-amber/30 hover:text-primary'
                      }`}
                    >
                      {getAgreementLabel(agreement)}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="space-y-4">
              {activeAgreement ? (
                <InvestorAgreementStatusCard
                  key={activeAgreement.id}
                  agreement={activeAgreement}
                  files={activeAgreement.files || {}}
                  onSigned={load}
                />
              ) : (
                <InvestorAgreementStatusCard agreement={null} files={{}} onSigned={load} />
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
