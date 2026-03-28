'use client';

import React, { useEffect, useState } from 'react';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';
import { LoadingSpinner } from '@/components';
import ContractorAgreementStatusCard, {
  type ContractorAgreementCardData,
  type ContractorAgreementCardFiles,
} from '@/components/contractor/ContractorAgreementStatusCard';

type AgreementResponse = {
  agreement: ContractorAgreementCardData | null;
  files: ContractorAgreementCardFiles;
};

export default function ContractorAgreementPage(): React.ReactElement {
  const [data, setData] = useState<AgreementResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/contractor/agreement');
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
      console.error('Failed to load contractor agreement:', error);
      setData({ agreement: null, files: {} });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
              <p className="text-secondary">View the draft, signed, and executed versions of your Finverno agreement.</p>
            </div>

            <ContractorAgreementStatusCard agreement={data?.agreement || null} files={data?.files || {}} onSigned={load} />
          </div>
        )}
      </div>
    </ContractorDashboardLayout>
  );
}
