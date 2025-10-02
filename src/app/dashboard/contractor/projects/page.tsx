'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';
import { Button, LoadingSpinner } from '@/components';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useContractorV2 } from '@/contexts/ContractorContextV2';
import EditableBOQTable from '@/components/EditableBOQTable';
import EditableScheduleTable from '@/components/EditableScheduleTable';
import BOQDisplay from '@/components/BOQDisplay';
import ScheduleDisplay from '@/components/ScheduleDisplay';

export default function ContractorProjects(): React.ReactElement {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { contractor, loading: contractorLoading } = useContractorV2();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'boq' | 'schedule'>('overview');
  const [refreshKey, setRefreshKey] = useState(0);
  const [enhancedProjectData, setEnhancedProjectData] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [showBOQEntry, setShowBOQEntry] = useState(false);
  const [showScheduleEntry, setShowScheduleEntry] = useState(false);
  
  // Get contractor ID from authenticated user
  const currentContractorId = user?.publicMetadata?.contractorId as string || 'CONTRACTOR_001';

  // Use Google Sheets projects from context
  const contractorProjects = contractor?.currentProjects || [];

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoaded) return;
    
    if (!user) {
      router.push('/sign-in');
      return;
    }
  }, [user, isLoaded, router]);

  // Calculate enhanced metrics when project is selected
  useEffect(() => {
    const calculateProjectMetrics = async () => {
      if (!selectedProject) {
        setEnhancedProjectData(null);
        return;
      }

      const projectData = contractorProjects.find(p => p.id === selectedProject);
      if (!projectData) return;

      try {
        setMetricsLoading(true);
        
        // Import metrics calculation function
        const { calculateProjectMetrics } = await import('@/lib/contractor-metrics');
        const calculatedMetrics = await calculateProjectMetrics(selectedProject);
        
        // Merge Google Sheets data with calculated metrics
        const enhanced = {
          ...projectData,
          // Use calculated values if available, otherwise fallback to Google Sheets
          projectValue: calculatedMetrics.projectValue ?? projectData.projectValue,
          currentProgress: calculatedMetrics.currentProgress ?? (projectData as any).currentProgress,
          expectedEndDate: calculatedMetrics.endDate ?? projectData.expectedEndDate,
          // Add metadata to show data source
          _dataSource: {
            value: calculatedMetrics.projectValue ? 'database' : 'sheets',
            progress: calculatedMetrics.currentProgress !== undefined ? 'database' : 'sheets',
            endDate: calculatedMetrics.endDate ? 'database' : 'sheets'
          }
        };
        
        setEnhancedProjectData(enhanced);
        console.log('📊 Enhanced project metrics:', enhanced);
      } catch (error) {
        console.error('Failed to calculate project metrics:', error);
        setEnhancedProjectData(projectData);
      } finally {
        setMetricsLoading(false);
      }
    };

    calculateProjectMetrics();
  }, [selectedProject, contractorProjects, refreshKey]);

  // Show loading state while Clerk loads OR contractor data loads
  if (!isLoaded || contractorLoading) {
    return (
      <div className="min-h-screen bg-neutral-darker">
        <LoadingSpinner 
          title={!isLoaded ? "Authenticating Access" : "Loading Project Portfolio"}
          description={!isLoaded ? 
            "Verifying your contractor credentials and setting up secure access" : 
            "Retrieving your active projects, milestones, and progress tracking data"
          }
          icon="📋"
          fullScreen={true}
          steps={!isLoaded ? [
            "Validating contractor account...",
            "Setting up secure session...",
            "Preparing project workspace..."
          ] : [
            "Loading active projects...",
            "Fetching milestone data...",
            "Calculating progress metrics..."
          ]}
        />
      </div>
    );
  }
  
  // If no contractor found AND loading is complete, show access denied
  if (!contractor && !contractorLoading) {
    return (
      <div className="min-h-screen bg-neutral-darker flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-primary mb-2">Access Denied</h2>
          <p className="text-secondary mb-4">
            No contractor account found for your email address.
          </p>
          <Button onClick={() => window.location.href = '/dashboard/contractor'} variant="primary" size="sm">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const selectedProjectData = enhancedProjectData || (selectedProject ? contractorProjects.find(p => p.id === selectedProject) : null);
  
  // Handle both data structures for selected project
  const isSelectedGoogleSheetsProject = selectedProjectData && 'clientName' in selectedProjectData;
  const selectedClientName = isSelectedGoogleSheetsProject ? 
    (selectedProjectData as any).clientName : 
    'Unknown Client';
  
  const selectedProjectProgress = selectedProjectData?.currentProgress ?? 
    (isSelectedGoogleSheetsProject ? (selectedProjectData as any).currentProgress : (selectedProjectData as any)?.progress || 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-success/10 text-success';
      case 'Planning': return 'bg-accent-blue/10 text-accent-blue';
      case 'On Hold': return 'bg-warning/10 text-warning';
      case 'Delayed': return 'bg-error/10 text-error';
      case 'Completing': return 'bg-success/10 text-success';
      case 'Completed': return 'bg-accent-amber/10 text-accent-amber';
      default: return 'bg-neutral-medium text-secondary';
    }
  };

  const getMilestoneStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'text-success';
      case 'In Progress': return 'text-accent-blue';
      case 'Delayed': return 'text-warning';
      case 'Pending': return 'text-secondary';
      default: return 'text-secondary';
    }
  };

  return (
    <ContractorDashboardLayout activeTab="projects">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">My Projects</h1>
          <p className="text-secondary">
            Manage and track progress of your active projects
          </p>
        </div>

        {/* Project Stats */}
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">TOTAL PROJECTS</div>
            <div className="text-2xl font-bold text-primary mb-1">{contractorProjects.length}</div>
            <div className="text-xs text-secondary">All time</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">ACTIVE PROJECTS</div>
            <div className="text-2xl font-bold text-primary mb-1">
              {contractorProjects.filter(p => p.status === 'Active').length}
            </div>
            <div className="text-xs text-success">Currently running</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">TOTAL VALUE</div>
            <div className="text-2xl font-bold text-primary mb-1">
              {formatCurrency(contractorProjects.reduce((sum, p) => sum + p.projectValue, 0))}
            </div>
            <div className="text-xs text-secondary">Contract value</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">AVG PROGRESS</div>
            <div className="text-2xl font-bold text-accent-amber mb-1">
              {contractorProjects.length > 0 ? 
                Math.round(contractorProjects.reduce((sum, p) => {
                  // Handle both Google Sheets (currentProgress) and mock data (progress)
                  const progress = 'currentProgress' in p ? (p as any).currentProgress : (p as any).progress || 0;
                  return sum + progress;
                }, 0) / contractorProjects.length) : 0}%
            </div>
            <div className="text-xs text-secondary">Across all projects</div>
          </div>
        </div>

        {/* Project Selector - Always a dropdown */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-primary mb-2">Select Project</label>
          <select
            value={selectedProject || ''}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full bg-neutral-dark border border-neutral-medium rounded-lg px-4 py-3 text-primary focus:border-accent-amber focus:outline-none"
          >
            <option value="">Choose a project...</option>
            {contractorProjects.map((project) => {
              const isGoogleSheetsProject = 'clientName' in project;
              const clientName = isGoogleSheetsProject ? (project as any).clientName : 'Unknown Client';
              return (
                <option key={project.id} value={project.id}>
                  {project.projectName} - {clientName}
                </option>
              );
            })}
          </select>
        </div>

        {/* Project Details - Always full width */}
        <div className="w-full">
            {selectedProjectData ? (
              <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
                <div className="p-6 border-b border-neutral-medium">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-primary mb-2">
                        {selectedProjectData.projectName}
                      </h2>
                      <div className="flex items-center space-x-4 text-sm text-secondary">
                        <span>Client: {selectedClientName}</span>
                        <span>•</span>
                        <span>Project ID: {selectedProjectData.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tab Navigation */}
                  <div className="flex space-x-1 mb-4">
                    <button
                      onClick={() => setActiveTab('overview')}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === 'overview'
                          ? 'bg-accent-amber text-neutral-dark'
                          : 'text-secondary hover:text-primary hover:bg-neutral-medium'
                      }`}
                    >
                      Overview
                    </button>
                    <button
                      onClick={() => setActiveTab('boq')}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === 'boq'
                          ? 'bg-accent-amber text-neutral-dark'
                          : 'text-secondary hover:text-primary hover:bg-neutral-medium'
                      }`}
                    >
                      BOQ
                    </button>
                    <button
                      onClick={() => setActiveTab('schedule')}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === 'schedule'
                          ? 'bg-accent-amber text-neutral-dark'
                          : 'text-secondary hover:text-primary hover:bg-neutral-medium'
                      }`}
                    >
                      Schedule
                    </button>
                  </div>

                  {/* Project Metrics - only show on overview tab */}
                  {activeTab === 'overview' && (
                    <>
                      {metricsLoading && (
                        <div className="flex items-center justify-center py-4 text-accent-amber">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-amber mr-2"></div>
                          <span className="text-sm">Calculating metrics from BOQ/Schedule...</span>
                        </div>
                      )}
                      <div className="grid md:grid-cols-4 gap-6">
                        <div>
                          <div className="text-xs text-secondary mb-1">Project Value</div>
                          <div className="text-lg font-bold text-primary">
                            {metricsLoading ? '...' : formatCurrency(selectedProjectData.projectValue)}
                          </div>
                          {selectedProjectData?._dataSource?.value === 'database' && (
                            <div className="text-xs text-success mt-1">📊 From BOQ</div>
                          )}
                          {selectedProjectData?._dataSource?.value === 'sheets' && (
                            <div className="text-xs text-secondary mt-1">📋 From Google Sheets</div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs text-secondary mb-1">Current Progress</div>
                          <div className="text-lg font-bold text-accent-amber">
                            {metricsLoading ? '...' : `${selectedProjectProgress}%`}
                          </div>
                          {selectedProjectData?._dataSource?.progress === 'database' && (
                            <div className="text-xs text-success mt-1">📈 From Schedule</div>
                          )}
                          {selectedProjectData?._dataSource?.progress === 'sheets' && (
                            <div className="text-xs text-secondary mt-1">📋 From Google Sheets</div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs text-secondary mb-1">End Date</div>
                          <div className="text-lg font-bold text-primary">
                            {metricsLoading ? '...' : formatDate(selectedProjectData.expectedEndDate)}
                          </div>
                          {selectedProjectData?._dataSource?.endDate === 'database' && (
                            <div className="text-xs text-success mt-1">📅 From Schedule</div>
                          )}
                          {selectedProjectData?._dataSource?.endDate === 'sheets' && (
                            <div className="text-xs text-secondary mt-1">📋 From Google Sheets</div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs text-secondary mb-1">Status</div>
                          <div className={`text-sm font-medium px-2 py-1 rounded inline-block ${getStatusColor(selectedProjectData.status)}`}>
                            {selectedProjectData.status}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="p-6">
                  {/* Overview Tab Content */}
                  {activeTab === 'overview' && (
                    <>
                      {/* Project Description */}
                      {!isSelectedGoogleSheetsProject && (selectedProjectData as any)?.description && (
                        <div className="mb-6">
                          <h3 className="text-sm font-semibold text-primary mb-2">Project Description</h3>
                          <p className="text-sm text-secondary leading-relaxed">
                            {(selectedProjectData as any).description}
                          </p>
                        </div>
                      )}

                      {/* Google Sheets Project Info */}
                      {isSelectedGoogleSheetsProject && (
                        <div className="mb-6">
                          <h3 className="text-lg font-bold text-primary mb-4">Project Information</h3>
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <div className="text-sm font-semibold text-primary mb-2">Next Milestone</div>
                              <div className="text-sm text-secondary">
                                {(selectedProjectData as any).nextMilestone} - {formatDate((selectedProjectData as any).nextMilestoneDate)}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-primary mb-2">Team Size</div>
                              <div className="text-sm text-secondary">
                                {(selectedProjectData as any).teamSize} team members
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-primary mb-2">Monthly Burn Rate</div>
                              <div className="text-sm text-secondary">
                                {formatCurrency((selectedProjectData as any).monthlyBurnRate)}/month
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-primary mb-2">Priority</div>
                              <div className="text-sm text-secondary">
                                {(selectedProjectData as any).priority}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Mock Data Milestones */}
                      {!isSelectedGoogleSheetsProject && (selectedProjectData as any)?.milestones && (
                        <div>
                          <h3 className="text-lg font-bold text-primary mb-4">Project Milestones</h3>
                          <div className="space-y-4">
                            {(selectedProjectData as any).milestones.map((milestone: any, index: number) => (
                            <div key={milestone.id} className="flex items-start space-x-4">
                              <div className="flex flex-col items-center">
                                <div className={`w-4 h-4 rounded-full ${
                                  milestone.status === 'Completed' ? 'bg-success' :
                                  milestone.status === 'In Progress' ? 'bg-accent-blue' :
                                  milestone.status === 'Delayed' ? 'bg-warning' : 'bg-neutral-medium'
                                }`}></div>
                                {index < (selectedProjectData as any).milestones.length - 1 && (
                                  <div className="w-0.5 h-12 bg-neutral-medium mt-2"></div>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-semibold text-primary">{milestone.name}</h4>
                                  <span className={`text-xs font-medium ${getMilestoneStatusColor(milestone.status)}`}>
                                    {milestone.status}
                                  </span>
                                </div>
                                <p className="text-sm text-secondary mb-2">{milestone.description}</p>
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                  <div>
                                    <span className="text-secondary">Due: </span>
                                    <span className="text-primary">{formatDate(milestone.expectedDate)}</span>
                                  </div>
                                  <div>
                                    <span className="text-secondary">Payment: </span>
                                    <span className="text-accent-amber">{milestone.paymentPercentage}%</span>
                                  </div>
                                </div>
                                {milestone.status === 'In Progress' && (
                                  <div className="mt-3">
                                    <Button variant="primary" size="sm">
                                      Mark Complete
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* BOQ Tab Content */}
                  {activeTab === 'boq' && (
                    <div className="space-y-6">
                      {!showBOQEntry ? (
                        /* BOQ Landing Page */
                        <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="text-2xl">📊</div>
                              <div>
                                <h3 className="text-lg font-semibold text-primary">Bill of Quantities</h3>
                                <p className="text-sm text-secondary">Add project costs, quantities, and rates</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setShowBOQEntry(true)}
                              className="bg-accent-amber text-neutral-dark px-4 py-2 rounded-lg font-medium hover:bg-accent-amber/90 transition-colors text-sm"
                            >
                              + Add BOQ
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* BOQ Entry Form */
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-primary">Enter BOQ Details</h3>
                            <button
                              onClick={() => setShowBOQEntry(false)}
                              className="text-secondary hover:text-primary text-sm flex items-center space-x-2"
                            >
                              <span>←</span>
                              <span>Back to Overview</span>
                            </button>
                          </div>
                          <EditableBOQTable
                            projectId={selectedProjectData.id}
                            contractorId={currentContractorId}
                            onSaveSuccess={() => {
                              setRefreshKey(prev => prev + 1);
                              setShowBOQEntry(false); // Hide form after successful save
                              setTimeout(() => setRefreshKey(prev => prev + 1), 500);
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Always show existing BOQ data if available */}
                      <BOQDisplay key={`boq-${refreshKey}`} projectId={selectedProjectData.id} />
                    </div>
                  )}

                  {/* Schedule Tab Content */}
                  {activeTab === 'schedule' && (
                    <div className="space-y-6">
                      {!showScheduleEntry ? (
                        /* Schedule Landing Page */
                        <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="text-2xl">📅</div>
                              <div>
                                <h3 className="text-lg font-semibold text-primary">Project Schedule</h3>
                                <p className="text-sm text-secondary">Create timeline with tasks and milestones</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setShowScheduleEntry(true)}
                              className="bg-accent-amber text-neutral-dark px-4 py-2 rounded-lg font-medium hover:bg-accent-amber/90 transition-colors text-sm"
                            >
                              + Add Schedule
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Schedule Entry Form */
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-primary">Enter Schedule Details</h3>
                            <button
                              onClick={() => setShowScheduleEntry(false)}
                              className="text-secondary hover:text-primary text-sm flex items-center space-x-2"
                            >
                              <span>←</span>
                              <span>Back to Overview</span>
                            </button>
                          </div>
                          <EditableScheduleTable
                            projectId={selectedProjectData.id}
                            contractorId={currentContractorId}
                            onSaveSuccess={() => {
                              setRefreshKey(prev => prev + 1);
                              setShowScheduleEntry(false); // Hide form after successful save
                              setTimeout(() => setRefreshKey(prev => prev + 1), 500);
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Always show existing Schedule data if available */}
                      <ScheduleDisplay key={`schedule-${refreshKey}`} projectId={selectedProjectData.id} contractorId={currentContractorId} />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-12 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-bold text-primary mb-2">Select a Project</h3>
                <p className="text-secondary">
                  Choose a project from the dropdown above to view detailed information, 
                  track milestones, and manage progress.
                </p>
              </div>
            )}
        </div>
      </div>
    </ContractorDashboardLayout>
  );
}