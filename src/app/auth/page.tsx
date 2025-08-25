'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components';

export default function AuthPage(): React.ReactElement {
  const router = useRouter();

  // useEffect(() => {
  //   // Redirect to the working Clerk sign-up page
  //   router.replace('/sign-up');
  // }, [router]);

  return (
    <div className="min-h-screen bg-neutral-darker">
      <LoadingSpinner 
        title="Redirecting to Sign Up"
        description="Taking you to the account creation page where you can join the Invero platform"
        icon="🔐"
        fullScreen={true}
        steps={[
          "Preparing sign up form...",
          "Loading security protocols...",
          "Redirecting to registration..."
        ]}
      />
    </div>
  );
}