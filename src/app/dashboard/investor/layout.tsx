'use client';

import { InvestorProvider } from '@/contexts/InvestorContext';

export default function InvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <InvestorProvider>
      {children}
    </InvestorProvider>
  );
}