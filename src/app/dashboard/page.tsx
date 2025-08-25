'use client';

import React, { useEffect } from 'react';
import { useUser, SignOutButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components';

export default function DashboardRouter(): React.ReactElement {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return; // Wait for user to load

    if (!user) {
      router.push('/sign-in');
      return;
    }

    const userData = user.publicMetadata;
    
    // If user has contractor role, go to contractor dashboard
    if (userData.role === 'contractor') {
      router.push('/dashboard/contractor');
      return;
    }
    
    // If user has investor role, go to investor dashboard  
    if (userData.role === 'investor') {
      router.push('/dashboard/investor');
      return;
    }
    
    // If no role is set, start contractor onboarding
    // (since most users will be contractors)
    router.push('/onboarding/contractor');
  }, [user, isLoaded, router]);

  // Loading state with manual override
  return (
    <div className="min-h-screen bg-neutral-darker">
      {/* Debug Header with Logout */}
      <div className="bg-red-600 text-white p-4 flex justify-between items-center">
        <div>
          <strong>DEBUG MODE:</strong> 
          {user ? ` Logged in as ${user.emailAddresses[0]?.emailAddress}` : ' Not logged in'}
        </div>
        {user && (
          <SignOutButton>
            <button className="bg-white text-red-600 px-4 py-2 rounded font-medium hover:bg-gray-100">
              Sign Out
            </button>
          </SignOutButton>
        )}
      </div>

      <div className="flex items-center justify-center" style={{minHeight: 'calc(100vh - 80px)'}}>
        <div className="text-center max-w-md">
          <LoadingSpinner 
            title="Welcome Back!"
            description="Redirecting you to your personalized dashboard based on your role"
            icon="🚀"
            steps={[
              "Identifying your account type...",
              "Loading dashboard preferences...",
              "Preparing your workspace..."
            ]}
          />
          <p className="text-secondary mb-6 mt-8">Access your Invero dashboard</p>
          
          {/* Manual navigation buttons */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/onboarding/contractor')}
              className="w-full bg-accent-orange hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Continue as Contractor
            </button>
            <button
              onClick={() => router.push('/dashboard/contractor')}
              className="w-full bg-neutral-medium hover:bg-neutral-light text-primary font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Go to Contractor Dashboard
            </button>
          </div>
          
          <p className="text-xs text-secondary mt-4">
            Having trouble? The system will redirect you automatically in a moment.
          </p>
        </div>
      </div>
    </div>
  );
}