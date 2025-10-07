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
  const [activeTab, setActiveTab] = useState<'overview' | 'boq' | 'schedule' | 'materials'>('overview');
  const [refreshKey, setRefreshKey] = useState(0);
  const [enhancedProjectData, setEnhancedProjectData] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [showBOQEntry, setShowBOQEntry] = useState(false);
  const [showScheduleEntry, setShowScheduleEntry] = useState(false);
  const [contractorProjects, setContractorProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [hasBOQData, setHasBOQData] = useState(false);
  const [hasScheduleData, setHasScheduleData] = useState(false);
  const [documentStatusLoading, setDocumentStatusLoading] = useState(false);
  const [materialsAnalyzing, setMaterialsAnalyzing] = useState(false);
  const [materialsAnalyzed, setMaterialsAnalyzed] = useState(false);
  const [materialMappings, setMaterialMappings] = useState<any[]>([]);
  
  // Get contractor ID from authenticated user
  const currentContractorId = user?.publicMetadata?.contractorId as string || 'CONTRACTOR_001';

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoaded) return;
    
    if (!user) {
      router.push('/sign-in');
      return;
    }
  }, [user, isLoaded, router]);

  // Fetch projects from database API
  useEffect(() => {
    const fetchProjects = async () => {
      if (!contractor?.id) return;
      
      setProjectsLoading(true);
      try {
        const response = await fetch(`/api/projects?contractor_id=${contractor.id}`);
        const result = await response.json();
        
        if (result.success) {
          // Transform database projects to match expected format
          const transformedProjects = result.data.projects.map((project: any) => ({
            id: project.id,
            projectName: project.project_name,
            clientName: project.client_name,
            projectValue: project.estimated_value,
            status: 'Planning', // Default status since it's not in DB yet
            expectedEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
            currentProgress: 0 // Default progress
          }));
          setContractorProjects(transformedProjects);
        } else {
          console.error('Failed to fetch projects:', result.error);
          setContractorProjects([]);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        setContractorProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    };

    fetchProjects();
  }, [contractor?.id, refreshKey]);

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
        
        // Merge project data with calculated metrics
        const enhanced = {
          ...projectData,
          // Use calculated values if available, otherwise fallback to defaults
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

  // Check for existing BOQ and schedule data when project is selected
  useEffect(() => {
    const checkDocumentStatus = async () => {
      if (!selectedProject) {
        setHasBOQData(false);
        setHasScheduleData(false);
        return;
      }

      try {
        setDocumentStatusLoading(true);
        
        // Import the functions needed to check for existing data
        const { getBOQByProjectId, getScheduleByProjectId } = await import('@/lib/supabase-boq');
        
        // Check for BOQ data
        const boqData = await getBOQByProjectId(selectedProject);
        setHasBOQData(boqData && boqData.length > 0);
        
        // Check for schedule data
        const scheduleData = await getScheduleByProjectId(selectedProject);
        setHasScheduleData(scheduleData && scheduleData.length > 0);
        
        // Check for existing material mappings
        try {
          const mappingsResponse = await fetch(`/api/material-mappings?project_id=${selectedProject}`);
          if (mappingsResponse.ok) {
            const mappingsResult = await mappingsResponse.json();
            if (mappingsResult.success && mappingsResult.data.length > 0) {
              setMaterialMappings(mappingsResult.data);
              setMaterialsAnalyzed(true);
            }
          }
        } catch (error) {
          console.error('Failed to fetch material mappings:', error);
        }
        
      } catch (error) {
        console.error('Failed to check document status:', error);
        setHasBOQData(false);
        setHasScheduleData(false);
      } finally {
        setDocumentStatusLoading(false);
      }
    };

    checkDocumentStatus();
  }, [selectedProject, refreshKey]);

  // Function to analyze BOQ with AI
  const analyzeBOQForMaterials = async () => {
    if (!selectedProject) return;
    
    setMaterialsAnalyzing(true);
    try {
      console.log('🤖 Starting BOQ analysis for project:', selectedProject);
      
      const response = await fetch('/api/analyze-boq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: selectedProject
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ BOQ analysis completed:', result.stats);
        setMaterialsAnalyzed(true);
        setMaterialMappings(result.mappings || []);
        // Optionally show success message or update UI
        alert(`Success! Analyzed ${result.stats.boqItemsAnalyzed} BOQ items and identified ${result.stats.materialsIdentified} materials.`);
      } else {
        console.error('❌ BOQ analysis failed:', result.error);
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('💥 Error calling BOQ analysis API:', error);
      alert('Failed to analyze BOQ. Please try again.');
    } finally {
      setMaterialsAnalyzing(false);
    }
  };

  // Show loading state while Clerk loads OR contractor data loads OR projects load
  if (!isLoaded || contractorLoading || projectsLoading) {
    return (
      <div className="min-h-screen bg-neutral-darker">
        <LoadingSpinner 
          title={!isLoaded ? "Authenticating Access" : projectsLoading ? "Loading Projects" : "Loading Project Portfolio"}
          description={!isLoaded ? 
            "Verifying your contractor credentials and setting up secure access" : 
            projectsLoading ?
            "Fetching your projects from the database..." :
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
                  // Handle both currentProgress and progress fields
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
                    <button
                      onClick={() => setActiveTab('materials')}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === 'materials'
                          ? 'bg-accent-amber text-neutral-dark'
                          : 'text-secondary hover:text-primary hover:bg-neutral-medium'
                      }`}
                    >
                      Materials
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
                        </div>
                        <div>
                          <div className="text-xs text-secondary mb-1">Current Progress</div>
                          <div className="text-lg font-bold text-accent-amber">
                            {metricsLoading ? '...' : `${selectedProjectProgress}%`}
                          </div>
                          {selectedProjectData?._dataSource?.progress === 'database' && (
                            <div className="text-xs text-success mt-1">📈 From Schedule</div>
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

                      {/* Project Documents Status */}
                      <div className="mb-6">
                        <h3 className="text-lg font-bold text-primary mb-4">Project Documents</h3>
                        <div className="grid grid-cols-3 gap-4">
                          {/* BOQ Status Card */}
                          <div className="bg-neutral-darker p-4 rounded-lg border border-neutral-medium">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">📊</span>
                                <h4 className="font-semibold text-primary">Bill of Quantities</h4>
                              </div>
                              <div className="flex items-center space-x-2">
                                {documentStatusLoading ? (
                                  <div className="w-2 h-2 rounded-full bg-accent-amber animate-pulse"></div>
                                ) : (
                                  <div className={`w-2 h-2 rounded-full ${hasBOQData ? 'bg-success' : 'bg-neutral-medium'}`}></div>
                                )}
                                <span className="text-xs text-secondary">
                                  {documentStatusLoading ? 'Checking...' : hasBOQData ? 'Uploaded' : 'Not uploaded'}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-secondary mb-3">
                              {hasBOQData ? 'View and manage project costs' : 'Upload project costs and quantities'}
                            </p>
                            <button
                              onClick={() => setActiveTab('boq')}
                              className="text-xs font-medium text-accent-amber hover:text-accent-amber/80 flex items-center space-x-1"
                            >
                              <span>{hasBOQData ? 'View BOQ' : '+ Add BOQ'}</span>
                              <span>→</span>
                            </button>
                          </div>

                          {/* Schedule Status Card */}
                          <div className="bg-neutral-darker p-4 rounded-lg border border-neutral-medium">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">📅</span>
                                <h4 className="font-semibold text-primary">Project Schedule</h4>
                              </div>
                              <div className="flex items-center space-x-2">
                                {documentStatusLoading ? (
                                  <div className="w-2 h-2 rounded-full bg-accent-amber animate-pulse"></div>
                                ) : (
                                  <div className={`w-2 h-2 rounded-full ${hasScheduleData ? 'bg-success' : 'bg-neutral-medium'}`}></div>
                                )}
                                <span className="text-xs text-secondary">
                                  {documentStatusLoading ? 'Checking...' : hasScheduleData ? 'Uploaded' : 'Not uploaded'}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-secondary mb-3">
                              {hasScheduleData ? 'View and manage project timeline' : 'Create timeline with tasks and milestones'}
                            </p>
                            <button
                              onClick={() => setActiveTab('schedule')}
                              className="text-xs font-medium text-accent-amber hover:text-accent-amber/80 flex items-center space-x-1"
                            >
                              <span>{hasScheduleData ? 'View Schedule' : '+ Add Schedule'}</span>
                              <span>→</span>
                            </button>
                          </div>
                          {/* Materials Status Card */}
                          <div className="bg-neutral-darker p-4 rounded-lg border border-neutral-medium">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">🏗️</span>
                                <h4 className="font-semibold text-primary">Project Materials</h4>
                              </div>
                              <div className="flex items-center space-x-2">
                                {materialsAnalyzing ? (
                                  <div className="w-2 h-2 rounded-full bg-accent-amber animate-pulse"></div>
                                ) : (
                                  <div className={`w-2 h-2 rounded-full ${materialsAnalyzed ? 'bg-success' : 'bg-neutral-medium'}`}></div>
                                )}
                                <span className="text-xs text-secondary">
                                  {materialsAnalyzing ? 'Analyzing...' : materialsAnalyzed ? 'Analyzed' : 'Not analyzed'}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-secondary mb-3">
                              AI-powered material extraction and procurement planning
                            </p>
                            <button
                              onClick={() => setActiveTab('materials')}
                              className="text-xs font-medium text-accent-amber hover:text-accent-amber/80 flex items-center space-x-1"
                            >
                              <span>🤖 Analyze Materials</span>
                              <span>→</span>
                            </button>
                          </div>
                        </div>
                      </div>


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

                  {/* Materials Tab Content */}
                  {activeTab === 'materials' && (
                    <div className="space-y-6">
                      {/* Materials Landing Page */}
                      <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl">🏗️</div>
                            <div>
                              <h3 className="text-lg font-semibold text-primary">Project Materials</h3>
                              <p className="text-sm text-secondary">AI-powered material extraction from BOQ and procurement management</p>
                            </div>
                          </div>
                          <button
                            onClick={analyzeBOQForMaterials}
                            className="bg-accent-amber text-neutral-dark px-4 py-2 rounded-lg font-medium hover:bg-accent-amber/90 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!hasBOQData || materialsAnalyzing}
                          >
                            {materialsAnalyzing ? '🔄 Analyzing...' : 
                             hasBOQData ? '🤖 Analyze BOQ' : 'Upload BOQ First'}
                          </button>
                        </div>
                      </div>

                      {/* Material Categories Overview */}
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="bg-neutral-darker p-4 rounded-lg border border-neutral-medium">
                          <div className="flex items-center space-x-3 mb-3">
                            <span className="text-2xl">🧱</span>
                            <div>
                              <h4 className="font-semibold text-primary">Structural Materials</h4>
                              <p className="text-xs text-secondary">Cement, Steel, Aggregates</p>
                            </div>
                          </div>
                          <div className="text-xs text-accent-amber">Coming from BOQ analysis</div>
                        </div>

                        <div className="bg-neutral-darker p-4 rounded-lg border border-neutral-medium">
                          <div className="flex items-center space-x-3 mb-3">
                            <span className="text-2xl">🔌</span>
                            <div>
                              <h4 className="font-semibold text-primary">MEP Materials</h4>
                              <p className="text-xs text-secondary">Electrical, Plumbing</p>
                            </div>
                          </div>
                          <div className="text-xs text-accent-amber">Coming from BOQ analysis</div>
                        </div>

                        <div className="bg-neutral-darker p-4 rounded-lg border border-neutral-medium">
                          <div className="flex items-center space-x-3 mb-3">
                            <span className="text-2xl">✨</span>
                            <div>
                              <h4 className="font-semibold text-primary">Finishing Materials</h4>
                              <p className="text-xs text-secondary">Tiles, Paint, Fixtures</p>
                            </div>
                          </div>
                          <div className="text-xs text-accent-amber">Coming from BOQ analysis</div>
                        </div>
                      </div>

                      {/* Materials List */}
                      {materialsAnalyzing ? (
                        <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-8 text-center">
                          <div className="text-4xl mb-4">⚙️</div>
                          <h3 className="text-lg font-bold text-primary mb-2">Analyzing BOQ...</h3>
                          <p className="text-secondary mb-4">
                            AI is extracting materials from your BOQ. This may take a moment.
                          </p>
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-amber mx-auto"></div>
                        </div>
                      ) : materialsAnalyzed && materialMappings.length > 0 ? (
                        <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
                          <div className="p-6 border-b border-neutral-medium">
                            <h3 className="text-lg font-bold text-primary mb-2">AI-Extracted Materials ({materialMappings.length})</h3>
                            <p className="text-secondary text-sm">
                              Materials identified from your BOQ using AI analysis. Review and request financing.
                            </p>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-neutral-medium">
                                  <th className="text-left p-4 text-primary font-semibold">Item</th>
                                  <th className="text-left p-4 text-primary font-semibold">Quantity</th>
                                  <th className="text-left p-4 text-primary font-semibold">Unit</th>
                                  <th className="text-left p-4 text-primary font-semibold">Status</th>
                                  <th className="text-center p-4 text-primary font-semibold">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {materialMappings.map((mapping, index) => (
                                  <tr key={index} className="border-b border-neutral-medium/50 hover:bg-neutral-darker/30">
                                    <td className="p-4">
                                      <div>
                                        <div className="font-medium text-primary">{mapping.material_name}</div>
                                        <div className="text-xs text-secondary mt-1">{mapping.boq_item_description}</div>
                                      </div>
                                    </td>
                                    <td className="p-4 text-accent-amber font-medium">
                                      {mapping.suggested_quantity}
                                    </td>
                                    <td className="p-4 text-secondary">
                                      {mapping.material_unit || 'Unit'}
                                    </td>
                                    <td className="p-4">
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        mapping.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                        mapping.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                        'bg-gray-500/20 text-gray-400'
                                      }`}>
                                        {mapping.status}
                                      </span>
                                    </td>
                                    <td className="p-4 text-center">
                                      <button className="bg-accent-amber text-neutral-dark px-4 py-2 rounded text-sm font-medium hover:bg-accent-amber/90 transition-colors">
                                        Request Financing
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-8 text-center">
                          <div className="text-4xl mb-4">🤖</div>
                          <h3 className="text-lg font-bold text-primary mb-2">AI Material Analysis</h3>
                          <p className="text-secondary mb-4">
                            {hasBOQData 
                              ? 'Click "Analyze BOQ" above to extract materials using AI and start procurement planning.'
                              : 'Upload your BOQ first, then we\'ll use AI to extract all required materials automatically.'
                            }
                          </p>
                          {!hasBOQData && (
                            <button
                              onClick={() => setActiveTab('boq')}
                              className="text-accent-amber hover:text-accent-amber/80 font-medium"
                            >
                              Go to BOQ Tab →
                            </button>
                          )}
                        </div>
                      )}
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