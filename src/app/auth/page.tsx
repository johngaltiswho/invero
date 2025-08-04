'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage(): React.ReactElement {
  const router = useRouter();

  // useEffect(() => {
  //   // Redirect to the working Clerk sign-up page
  //   router.replace('/sign-up');
  // }, [router]);

  return (
    <div className="min-h-screen bg-neutral-darker flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🔄</div>
        <h2 className="text-xl font-bold text-primary mb-2">Redirecting...</h2>
        <p className="text-secondary">Taking you to sign up</p>
      </div>
    </div>
  );
}