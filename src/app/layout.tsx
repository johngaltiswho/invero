import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';
import { ContractorProvider } from '@/contexts/ContractorContext';

export const metadata: Metadata = {
  title: "Invero - Financial Intelligence Platform",
  description: "Modern financial intelligence and analytics platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="antialiased" suppressHydrationWarning={true}>
          <ContractorProvider>
            {children}
          </ContractorProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}