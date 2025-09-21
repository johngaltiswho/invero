import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';

export const metadata: Metadata = {
  title: "Finverno - Project Supply Enablement Platform",
  description: "Contract-backed supply enablement for infrastructure project execution",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  if (!publishableKey) {
    console.warn('Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <html lang="en">
        <body className="antialiased" suppressHydrationWarning={true}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}