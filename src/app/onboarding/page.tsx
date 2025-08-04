'use client';

import React, { useState } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components';

export default function OnboardingPage(): React.ReactElement {
  const { user } = useUser();
  const { user: clerkUser } = useClerk();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [contractorId, setContractorId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleRoleSelection = async () => {
    if (!selectedRole || !user) return;

    setLoading(true);
    
    try {
      // Update user metadata with role information
      await user.update({
        unsafeMetadata: {
          role: selectedRole,
          ...(selectedRole === 'contractor' && contractorId && { contractorId }),
          onboardingComplete: true,
        },
      });

      // Redirect based on role
      if (selectedRole === 'contractor') {
        router.push('/dashboard/contractor');
      } else {
        router.push('/dashboard/investor');
      }
    } catch (error) {
      console.error('Error updating user metadata:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-darker flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Welcome to Invero, {user?.firstName}!
          </h1>
          <p className="text-secondary mb-8">
            Let's set up your account. What best describes you?
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Contractor Option */}
          <div 
            onClick={() => setSelectedRole('contractor')}
            className={`p-8 rounded-lg border-2 cursor-pointer transition-all ${
              selectedRole === 'contractor' 
                ? 'border-accent-amber bg-accent-amber/5' 
                : 'border-neutral-medium bg-neutral-dark hover:border-neutral-light'
            }`}
          >
            <div className="text-center">
              <div className="text-4xl mb-4">🏗️</div>
              <h2 className="text-xl font-bold text-primary mb-2">Contractor</h2>
              <p className="text-sm text-secondary mb-4">
                I'm a contractor looking for project funding and want to manage my projects
              </p>
              <ul className="text-sm text-secondary text-left space-y-1">
                <li>• Manage project portfolios</li>
                <li>• Track project progress</li>
                <li>• Access funding opportunities</li>
                <li>• Submit progress reports</li>
              </ul>
            </div>
          </div>

          {/* HNI Investor Option */}
          <div 
            onClick={() => setSelectedRole('investor')}
            className={`p-8 rounded-lg border-2 cursor-pointer transition-all ${
              selectedRole === 'investor' 
                ? 'border-accent-amber bg-accent-amber/5' 
                : 'border-neutral-medium bg-neutral-dark hover:border-neutral-light'
            }`}
          >
            <div className="text-center">
              <div className="text-4xl mb-4">💰</div>
              <h2 className="text-xl font-bold text-primary mb-2">HNI Investor</h2>
              <p className="text-sm text-secondary mb-4">
                I'm an investor looking to invest in contractor projects and track returns
              </p>
              <ul className="text-sm text-secondary text-left space-y-1">
                <li>• Browse investment opportunities</li>
                <li>• Track investment performance</li>
                <li>• Monitor project progress</li>
                <li>• View analytics and reports</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contractor ID Input */}
        {selectedRole === 'contractor' && (
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <h3 className="text-lg font-semibold text-primary mb-4">Contractor Details</h3>
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Contractor ID (from your Google Sheet)
              </label>
              <input
                type="text"
                value={contractorId}
                onChange={(e) => setContractorId(e.target.value)}
                placeholder="e.g., CONTRACTOR_001"
                className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-medium text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent-amber focus:border-transparent"
              />
              <p className="text-xs text-secondary mt-1">
                This should match your ID in the contractor database
              </p>
            </div>
          </div>
        )}

        {/* Continue Button */}
        <div className="flex justify-center">
          <Button
            variant="primary"
            size="lg"
            onClick={handleRoleSelection}
            disabled={!selectedRole || (selectedRole === 'contractor' && !contractorId) || loading}
            className="px-8 py-3"
          >
            {loading ? 'Setting up your account...' : 'Continue to Dashboard'}
          </Button>
        </div>
      </div>
    </div>
  );
}