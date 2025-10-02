'use client';

import { ContractorProvider } from '@/contexts/ContractorContextV2';

export default function ContractorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ContractorProvider>
      {children}
    </ContractorProvider>
  );
}