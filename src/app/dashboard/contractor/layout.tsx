'use client';

import { ContractorProvider } from '@/contexts/ContractorContext';

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