'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';
import { Button, LoadingSpinner } from '@/components';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useContractorV2 } from '@/contexts/ContractorContextV2';
import RegistrationBanner from '@/components/RegistrationBanner';
import CreateProjectForm from '@/components/CreateProjectForm';
import MasterSchedule from '@/components/MasterSchedule';
// import ProjectHealthOverview from '@/components/ProjectHealthOverview'; // Hidden for now

export default function ContractorDashboard(): React.ReactElement {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const { contractor, loading: contractorLoading, accessInfo } = useContractorV2();
  const [contractorStatus, setContractorStatus] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [selectedQuickAction, setSelectedQuickAction] = useState('create_project');
  const [financeSummary, setFinanceSummary] = useState<{
    total_requests: number;
    total_requested_value: number;
    total_funded: number;
    total_platform_fee: number;
  total_participation_fee: number;
    total_due: number;
    total_projects: number;
  } | null>(null);
  const [financeTerms, setFinanceTerms] = useState<{
    platform_fee_rate: number;
    platform_fee_cap: number;
  participation_fee_rate_daily: number;
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

  const activeProjectsCount = projects.filter((project) => {
    const status = String(project.project_status || '').toLowerCase();
    const isAwarded = status === 'awarded' || status === 'finalized';
    const isCompleted = status === 'completed';
    return isAwarded && !isCompleted;
  }).length;

  const handleQuickAction = () => {
    switch (selectedQuickAction) {
      case 'create_project':
        setShowCreateProject(true);
        return;
      case 'manage_projects':
        window.location.href = '/dashboard/contractor/projects';
        return;
      case 'update_progress':
        window.location.href = '/dashboard/contractor/progress';
        return;
      case 'submit_invoice':
        window.location.href = '/dashboard/contractor/invoices';
        return;
      default:
        return;
    }
  };

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

  // Access denied — user is not pre-registered as a contractor
  if (accessInfo && !accessInfo.hasAccess) {
    return (
      <div className="min-h-screen bg-neutral-darker flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-neutral-dark rounded-xl border border-neutral-medium p-8 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-primary mb-2">Access Not Granted</h1>
          <p className="text-secondary mb-6">
            {accessInfo.message || 'Your email is not registered as a contractor. Please contact the administrator to get access.'}
          </p>
          <div className="bg-neutral-medium/40 rounded-lg p-4 text-sm text-secondary mb-6">
            <p className="font-medium text-primary mb-1">Signed in as:</p>
            <p>{user?.emailAddresses[0]?.emailAddress}</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => signOut(() => router.push('/sign-in'))}
          >
            Sign out
          </Button>
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

        {/* Registration progress banner — hidden once fully registered */}
        {!accessInfo?.registrationComplete && (
          <RegistrationBanner
            registrationStep={accessInfo?.registrationStep ?? 'not_applied'}
            message={accessInfo?.message}
            canRetry={accessInfo?.canRetry ?? false}
          />
        )}

        {/* Top Row: Key Metrics + Quick Actions */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium min-h-[180px]">
            <div className="text-accent-amber text-sm font-mono mb-6">ACTIVE PROJECTS</div>
            <div className="text-2xl font-bold text-primary mb-1">
              {projectsLoading ? '-' : activeProjectsCount}
            </div>
            <div className="text-xs text-secondary">
              {projectsLoading ? 'Loading...' : 'Awarded and in progress'}
            </div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium min-h-[180px]">
            <div className="text-accent-amber text-sm font-mono mb-6">TOTAL VALUE</div>
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

          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium min-h-[180px]">
            <h3 className="text-lg font-semibold text-primary mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <select
                value={selectedQuickAction}
                onChange={(event) => setSelectedQuickAction(event.target.value)}
                className="w-full px-4 py-3 rounded-lg border bg-neutral-darker text-primary focus:outline-none focus:ring-2 focus:ring-accent-amber focus:border-transparent transition-all duration-200 border-neutral-medium"
              >
                <option value="create_project">Create New Project</option>
                <option value="manage_projects">Manage Projects</option>
                <option value="update_progress">Update Progress</option>
                <option value="submit_invoice">Submit Invoice</option>
              </select>
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={handleQuickAction}
              >
                Run Action
              </Button>
              <p className="text-xs text-secondary">
                Use one quick action at a time without taking up a full card column.
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium min-h-[170px]">
            <div className="text-accent-amber text-sm font-mono mb-6">MATERIALS FUNDED</div>
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

          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium min-h-[170px]">
            <div className="text-accent-amber text-sm font-mono mb-6">TOTAL DUE</div>
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

          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium min-h-[170px]">
            <div className="text-accent-amber text-sm font-mono mb-6">PURCHASE REQUEST VALUE</div>
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
                <div className="text-secondary mb-1">Project Participation Fee (Daily)</div>
                <div className="text-primary font-semibold">
                  {(financeTerms.participation_fee_rate_daily * 100).toFixed(2)}% per day
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
