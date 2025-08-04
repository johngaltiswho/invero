'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useContractor } from '@/contexts/ContractorContext';

export default function ContractorOnboarding() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { contractor, loading: contractorLoading, error } = useContractor();
  const [verificationState, setVerificationState] = useState<{
    status: 'loading' | 'found' | 'not_found' | 'error';
    message?: string;
    contractorName?: string;
  }>({ status: 'loading' });

  useEffect(() => {
    if (!isLoaded || !user) return;

    if (contractorLoading) {
      setVerificationState({ status: 'loading' });
      return;
    }

    if (contractor) {
      // Contractor found in context, redirect to dashboard
      setVerificationState({ 
        status: 'found', 
        contractorName: contractor.companyName,
        message: `Welcome ${contractor.companyName}! Redirecting to dashboard...`
      });
      
      // Short delay to show success message, then redirect
      setTimeout(() => {
        router.replace('/dashboard/contractor');
      }, 1500);
    } else if (error) {
      // Error loading contractor
      setVerificationState({ 
        status: 'error',
        message: error
      });
    } else {
      // No contractor found and no error
      setVerificationState({ 
        status: 'not_found',
        message: 'No contractor found for your email address'
      });
    }
  }, [isLoaded, user, contractor, contractorLoading, error, router]);

  if (!isLoaded || verificationState.status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="text-4xl mb-4">🔄</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Loading...</h2>
          <p className="text-gray-600">Checking your contractor access</p>
        </div>
      </div>
    );
  }

  if (verificationState.status === 'found') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-green-600 mb-2">Access Verified!</h2>
          <p className="text-gray-600">{verificationState.message}</p>
        </div>
      </div>
    );
  }

  // Not found or error state
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {verificationState.status === 'error' ? 'Verification Error' : 'Access Not Found'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {verificationState.status === 'error' 
              ? 'There was a problem verifying your contractor account'
              : 'No contractor account found for your email address'
            }
          </p>
        </div>
        
        <div className={`rounded-md p-4 ${verificationState.status === 'error' ? 'bg-yellow-50' : 'bg-red-50'}`}>
          <div className={`text-sm ${verificationState.status === 'error' ? 'text-yellow-700' : 'text-red-700'}`}>
            <strong>Email:</strong> {user?.emailAddresses[0]?.emailAddress}
            <br />
            <br />
            {verificationState.status === 'error' ? (
              <>
                {verificationState.message}
                <br /><br />
                Please try again or contact the administrator if the problem persists.
              </>
            ) : (
              <>
                Your email address is not registered as a contractor in our system. 
                Please contact the administrator to get access.
              </>
            )}
          </div>
        </div>

        {verificationState.status === 'error' && (
          <div className="text-center">
            <button
              onClick={() => window.location.reload()}
              className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Try Again
            </button>
          </div>
        )}

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Need access?{' '}
            <a href="mailto:admin@invero.com" className="font-medium text-blue-600 hover:text-blue-500">
              Contact admin
            </a>
          </p>
        </div>

        <div className="text-center">
          <button
            onClick={() => router.push('/sign-in')}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            ← Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}