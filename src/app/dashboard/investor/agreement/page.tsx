'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { LoadingSpinner } from '@/components';
import InvestorAgreementStatusCard from '@/components/investor/InvestorAgreementStatusCard';

type AgreementResponse = {
  agreement: any;
  files: {
    draft_url?: string | null;
    signed_url?: string | null;
    executed_url?: string | null;
  };
};

export default function InvestorAgreementPage(): React.ReactElement {
  const [data, setData] = useState<AgreementResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/investor/agreement');
      const result = await response.json();
      if (response.ok && result.success) {
        setData({
          agreement: result.agreement,
          files: result.files || {},
        });
      } else {
        setData({ agreement: null, files: {} });
      }
    } catch (error) {
      console.error('Failed to load investor agreement:', error);
      setData({ agreement: null, files: {} });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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

            <InvestorAgreementStatusCard agreement={data?.agreement || null} files={data?.files || {}} onSigned={load} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
