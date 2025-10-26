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
import ProjectHealthOverview from '@/components/ProjectHealthOverview';

export default function ContractorDashboard(): React.ReactElement {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { contractor, loading: contractorLoading, accessInfo } = useContractorV2();
  const [contractorStatus, setContractorStatus] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [showCreateProject, setShowCreateProject] = useState(false);

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

        {/* Project Health Section */}
        <div className="mb-8">
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <h3 className="text-lg font-semibold text-primary mb-4">Project Health</h3>
            <ProjectHealthOverview projects={projects} />
          </div>
        </div>

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