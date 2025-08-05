'use client';

import { SignIn } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

function SignInComponent() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || '/';

  return (
    <SignIn 
      fallbackRedirectUrl={redirectUrl}
      routing="hash"
      appearance={{
        elements: {
          rootBox: "mx-auto",
          card: "shadow-lg"
        }
      }}
    />
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<div>Loading...</div>}>
        <SignInComponent />
      </Suspense>
    </div>
  );
}