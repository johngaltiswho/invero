'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';
import { Button, LoadingSpinner } from '@/components';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useContractorV2 } from '@/contexts/ContractorContextV2';
import CreateProjectForm from '@/components/CreateProjectForm';
import MasterSchedule from '@/components/MasterSchedule';
// import ProjectHealthOverview from '@/components/ProjectHealthOverview'; // Hidden for now

export default function ContractorDashboard(): React.ReactElement {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { contractor, loading: contractorLoading, accessInfo } = useContractorV2();
  const [contractorStatus, setContractorStatus] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [financeSummary, setFinanceSummary] = useState<{
    total_requests: number;
    total_requested_value: number;
    total_funded: number;
    total_platform_fee: number;
    total_interest: number;
    total_due: number;
    total_projects: number;
  } | null>(null);
  const [financeTerms, setFinanceTerms] = useState<{
    platform_fee_rate: number;
    platform_fee_cap: number;
    interest_rate_daily: number;
  } | null>(null);
  const [financeLoading, setFinanceLoading] = useState(true);

  // Fetch projects from database
  useEffect(() => {
    const fetchProjects = async () => {
      if (!contractor?.id) return;
      
      setProjectsLoading(true);
      try {
        const response = await fetch(`/api/projects?contractor_id=${contractor.id}`);
        const result = await response.json();
        
        if (result.success) {
          setProjects(result.data.projects);
        } else {
          console.error('Failed to fetch projects:', result.error);
          setProjects([]);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        setProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    };

    fetchProjects();
  }, [contractor?.id]);

  useEffect(() => {
    const fetchFinanceSummary = async () => {
      if (!contractor?.id) return;
      setFinanceLoading(true);
      try {
        const response = await fetch('/api/contractor/finance/overview');
        const result = await response.json();
        if (response.ok) {
          setFinanceSummary(result.summary || null);
          setFinanceTerms(result.terms || null);
        } else {
          console.error('Failed to fetch finance summary:', result.error);
          setFinanceSummary(null);
          setFinanceTerms(null);
        }
      } catch (error) {
        console.error('Error fetching finance summary:', error);
        setFinanceSummary(null);
        setFinanceTerms(null);
      } finally {
        setFinanceLoading(false);
      }
    };

    fetchFinanceSummary();
  }, [contractor?.id]);

  // Set contractor status from context
  useEffect(() => {
    if (contractor) {
      setContractorStatus(contractor);
    }
  }, [contractor]);

  // Simple auth check - middleware handles contractor access control
  useEffect(() => {
    if (!isLoaded) return;
    
    if (!user) {
      router.push('/sign-in');
      return;
    }
  }, [user, isLoaded, router]);

  // Show loading while data is being fetched
  if (!isLoaded || contractorLoading) {
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
            Welcome back to your contractor portal, {contractorStatus?.company_name || contractorStatus?.companyName}
          </p>
        </div>

        {/* Top Row: Key Metrics + Quick Actions */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="flex items-center justify-between mb-4">
              <div className="text-accent-amber text-sm font-mono">ACTIVE PROJECTS</div>
              <div className="text-2xl">🏗️</div>
            </div>
            <div className="text-2xl font-bold text-primary mb-1">
              {projectsLoading ? '-' : projects.length}
            </div>
            <div className="text-xs text-secondary">
              {projectsLoading ? 'Loading...' : 'Currently active'}
            </div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="flex items-center justify-between mb-4">
              <div className="text-accent-amber text-sm font-mono">TOTAL VALUE</div>
              <div className="text-2xl">💰</div>
            </div>
            <div className="text-2xl font-bold text-primary mb-1">
              {projectsLoading ? '-' : new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(projects.reduce((sum, p) => sum + (p.estimated_value || 0), 0))}
            </div>
            <div className="text-xs text-secondary">Contract value</div>
          </div>

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
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="flex items-center justify-between mb-4">
              <div className="text-accent-amber text-sm font-mono">MATERIALS FUNDED</div>
              <div className="text-2xl">💳</div>
            </div>
            <div className="text-2xl font-bold text-primary mb-1">
              {financeLoading || !financeSummary ? '-' : new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(financeSummary.total_funded)}
            </div>
            <div className="text-xs text-secondary">
              {financeLoading ? 'Loading...' : `${financeSummary?.total_requests || 0} purchase requests`}
            </div>
          </div>

          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="flex items-center justify-between mb-4">
              <div className="text-accent-amber text-sm font-mono">TOTAL DUE</div>
              <div className="text-2xl">📌</div>
            </div>
            <div className="text-2xl font-bold text-accent-blue mb-1">
              {financeLoading || !financeSummary ? '-' : new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(financeSummary.total_due)}
            </div>
            <div className="text-xs text-secondary">Includes fees and interest</div>
          </div>

          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="flex items-center justify-between mb-4">
              <div className="text-accent-amber text-sm font-mono">PURCHASE REQUEST VALUE</div>
              <div className="text-2xl">🧾</div>
            </div>
            <div className="text-2xl font-bold text-primary mb-1">
              {financeLoading || !financeSummary ? '-' : new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(financeSummary.total_requested_value)}
            </div>
            <div className="text-xs text-secondary">
              Across {financeSummary?.total_projects || 0} projects
            </div>
          </div>
        </div>

        {financeTerms && (
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6 mb-8">
            <h3 className="text-lg font-semibold text-primary mb-4">Financing Terms</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="bg-neutral-darker/60 p-4 rounded-lg border border-neutral-medium">
                <div className="text-secondary mb-1">Platform Fee</div>
                <div className="text-primary font-semibold">
                  {(financeTerms.platform_fee_rate * 100).toFixed(2)}% (cap ₹{financeTerms.platform_fee_cap.toLocaleString('en-IN')})
                </div>
              </div>
              <div className="bg-neutral-darker/60 p-4 rounded-lg border border-neutral-medium">
                <div className="text-secondary mb-1">Late Fees (Daily)</div>
                <div className="text-primary font-semibold">
                  {(financeTerms.interest_rate_daily * 100).toFixed(2)}% per day
                </div>
              </div>
              <div className="bg-neutral-darker/60 p-4 rounded-lg border border-neutral-medium">
                <div className="text-secondary mb-1">Applied To</div>
                <div className="text-primary font-semibold">Outstanding funded balance</div>
              </div>
            </div>
          </div>
        )}

        {/* Project Health Section - Hidden for now, uncomment to bring back */}
        {/*
        <div className="mb-8">
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <h3 className="text-lg font-semibold text-primary mb-4">Project Health</h3>
            <ProjectHealthOverview projects={projects} />
          </div>
        </div>
        */}

        {/* Master Schedule */}
        <div className="mb-8">
          <MasterSchedule 
            contractorProjects={projects.map(p => ({
              id: p.id,
              projectName: p.project_name,
              clientName: p.client_name
            }))}
            contractorId={contractor?.id || ''}
          />
        </div>

        {/* Create Project Modal */}
        {showCreateProject && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <CreateProjectForm
                onSuccess={() => {
                  setShowCreateProject(false);
                  // Refresh projects data
                  if (contractor?.id) {
                    fetch(`/api/projects?contractor_id=${contractor.id}`)
                      .then(res => res.json())
                      .then(result => {
                        if (result.success) {
                          setProjects(result.data.projects);
                        }
                      })
                      .catch(console.error);
                  }
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
