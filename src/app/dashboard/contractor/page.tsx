'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';
import { Button, LoadingSpinner } from '@/components';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import CreateProjectForm from '@/components/CreateProjectForm';

export default function ContractorDashboard(): React.ReactElement {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [contractorStatus, setContractorStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateProject, setShowCreateProject] = useState(false);

  // Check contractor status
  useEffect(() => {
    const checkStatus = async () => {
      if (!user?.primaryEmailAddress?.emailAddress) return;
      
      try {
        const response = await fetch(`/api/contractor-application-v2?email=${user.primaryEmailAddress.emailAddress}`);
        const data = await response.json();
        
        if (data.success) {
          const status = data.data;
          
          // Check if verified and approved
          if (status.verificationStatus === 'verified' && status.status === 'approved') {
            setContractorStatus(status);
            setLoading(false);
          } else {
            // Redirect to status page
            router.push('/contractors/status');
          }
        } else {
          // No application found, redirect to apply
          router.push('/contractors/apply');
        }
      } catch (error) {
        console.error('Error checking contractor status:', error);
        router.push('/contractors/status');
      }
    };
    
    if (isLoaded && user) {
      checkStatus();
    }
  }, [user, isLoaded, router]);

  // Simple loading state
  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-neutral-darker flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <div className="text-primary mt-4">Loading contractor dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <ContractorDashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Dashboard Overview</h1>
          <p className="text-secondary">
            Welcome back to your contractor portal, {contractorStatus?.companyName}
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="flex items-center justify-between mb-4">
              <div className="text-accent-amber text-sm font-mono">ACTIVE PROJECTS</div>
              <div className="text-2xl">🏗️</div>
            </div>
            <div className="text-2xl font-bold text-primary mb-1">-</div>
            <div className="text-xs text-secondary">Loading...</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="flex items-center justify-between mb-4">
              <div className="text-accent-amber text-sm font-mono">TOTAL VALUE</div>
              <div className="text-2xl">💰</div>
            </div>
            <div className="text-2xl font-bold text-primary mb-1">-</div>
            <div className="text-xs text-secondary">Contract value</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="flex items-center justify-between mb-4">
              <div className="text-accent-amber text-sm font-mono">COMPLETION RATE</div>
              <div className="text-2xl">📈</div>
            </div>
            <div className="text-2xl font-bold text-accent-amber mb-1">-</div>
            <div className="text-xs text-secondary">Average progress</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="flex items-center justify-between mb-4">
              <div className="text-accent-amber text-sm font-mono">NEXT MILESTONE</div>
              <div className="text-2xl">🎯</div>
            </div>
            <div className="text-2xl font-bold text-primary mb-1">-</div>
            <div className="text-xs text-secondary">Upcoming deadline</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <h3 className="text-lg font-semibold text-primary mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button 
                variant="primary" 
                size="sm" 
                className="w-full"
                onClick={() => setShowCreateProject(true)}
              >
                ➕ Create New Project
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => window.location.href = '/dashboard/contractor/projects'}
              >
                📋 Manage Projects
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => window.location.href = '/dashboard/contractor/progress'}
              >
                📊 Update Progress
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
              >
                💸 Submit Invoice
              </Button>
            </div>
          </div>

          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <h3 className="text-lg font-semibold text-primary mb-4">Project Status</h3>
            <div className="text-center py-8 text-secondary">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-sm">Project data will appear here</p>
            </div>
          </div>

          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <h3 className="text-lg font-semibold text-primary mb-4">Recent Activity</h3>
            <div className="text-center py-8 text-secondary">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-sm">Activity feed will appear here</p>
            </div>
          </div>
        </div>

        {/* Upcoming Milestones */}
        <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
          <h3 className="text-lg font-semibold text-primary mb-4">Upcoming Milestones</h3>
          <div className="text-center py-8 text-secondary">
            <div className="text-4xl mb-2">🎯</div>
            <p className="text-sm">Milestone data will appear here</p>
          </div>
        </div>

        {/* Create Project Modal */}
        {showCreateProject && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <CreateProjectForm
                onSuccess={() => {
                  setShowCreateProject(false);
                  // Optionally refresh dashboard data
                }}
                onCancel={() => setShowCreateProject(false)}
              />
            </div>
          </div>
        )}
      </div>
    </ContractorDashboardLayout>
  );
}