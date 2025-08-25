'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';
import { Button, LoadingSpinner } from '@/components';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useContractor } from '@/contexts/ContractorContext';

export default function ContractorDashboard(): React.ReactElement {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { contractor, loading: contractorLoading, error } = useContractor();
  
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

  // Show loading state while Clerk loads OR contractor data loads
  if (!isLoaded || contractorLoading) {
    return (
      <div className="min-h-screen bg-neutral-darker">
        <LoadingSpinner 
          title={!isLoaded ? "Verifying Contractor Access" : "Loading Contractor Dashboard"}
          description={!isLoaded ? 
            "Authenticating your contractor credentials and preparing your workspace" : 
            "Retrieving your company profile, projects, and business analytics from our system"
          }
          icon="🏗️"
          fullScreen={true}
          steps={!isLoaded ? [
            "Validating contractor credentials...",
            "Establishing secure connection...",
            "Preparing contractor workspace..."
          ] : [
            "Loading company profile...",
            "Fetching active projects...",
            "Calculating business metrics..."
          ]}
        />
      </div>
    );
  }
  
  // If there's an error, show error state
  if (error && !contractor && !contractorLoading) {
    return (
      <div className="min-h-screen bg-neutral-darker flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-primary mb-2">Access Denied</h2>
          <p className="text-secondary mb-4">
            Your email is not registered as a contractor in our system.
          </p>
          <p className="text-xs text-secondary mb-4">{error}</p>
          <div className="space-x-4">
            <Button onClick={() => window.location.href = '/sign-in'} variant="outline" size="sm">
              Back to Login
            </Button>
            <Button onClick={() => window.location.reload()} variant="primary" size="sm">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // If no contractor found after loading, show access denied
  if (!contractor && !contractorLoading) {
    return (
      <div className="min-h-screen bg-neutral-darker flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-primary mb-2">Access Not Found</h2>
          <p className="text-secondary mb-4">
            No contractor account found for your email address.
          </p>
          <p className="text-secondary mb-4">
            Please contact the administrator to get access to the contractor portal.
          </p>
          <Button onClick={() => window.location.href = '/sign-in'} variant="primary" size="sm">
            Back to Login
          </Button>
        </div>
      </div>
    );
  }
  
  // Use only Google Sheets data (no mockdata fallback)
  const contractorProjects = contractor?.currentProjects || [];
  const projectMilestones = contractor?.projectMilestones || [];
  const financialMilestones = contractor?.financialMilestones || [];
  const recentActivity = contractor?.activities || [];
  
  // Dashboard data ready
  
  // Convert financial milestones to recent activity format
  const financialActivities = financialMilestones.map((fm: any) => ({
    id: fm.id,
    type: fm.transactionType.includes('received') ? 'payment_received' as const : 'funding_request' as const,
    title: fm.description,
    description: fm.category,
    date: fm.date,
    project: `Project ${fm.project_ID}`,
    amount: fm.amount,
    status: fm.transactionType.includes('Disbursed') ? 'completed' as const : 'payment_released' as const
  }));
  
  // Combine activities with financial milestones
  const allRecentActivity = [...recentActivity, ...financialActivities]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10); // Show last 10 activities
  
  const contractorData = {
    companyName: contractor?.companyName || '',
    totalProjects: contractorProjects.length,
    activeProjects: contractorProjects.filter(p => p.status === 'Active').length,
    totalContractValue: contractorProjects.reduce((sum, p) => sum + p.projectValue, 0),
    pendingPayments: contractorProjects
      .filter(p => p.status === 'Active')
      .reduce((sum, p) => sum + (p.projectValue * 0.3), 0), // Assume 30% pending
    nextMilestone: contractorProjects.find(p => p.status === 'Active')?.nextMilestone || 'No upcoming milestones',
    creditUtilization: contractor?.capacityUtilization || 0,
    availableCredit: contractor?.availableCapacity || 0
  };

  // Data now comes from Google Sheets via contractor context
  // recentActivity and upcomingMilestones are defined above from contractor data

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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'milestone_completed': return '✅';
      case 'payment_received': return '💰';
      case 'document_uploaded': return '📄';
      case 'funding_request': return '📋';
      default: return '📌';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'text-success';
      case 'planning': return 'text-accent-blue';
      case 'pending': return 'text-secondary';
      case 'delayed': return 'text-warning';
      case 'completed': return 'text-success';
      case 'approved': return 'text-success';
      case 'payment_released': return 'text-accent-amber';
      case 'pending_review': return 'text-accent-blue';
      default: return 'text-secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-warning';
      case 'medium': return 'border-l-accent-amber';
      case 'low': return 'border-l-accent-blue';
      default: return 'border-l-neutral-medium';
    }
  };

  return (
    <ContractorDashboardLayout activeTab="overview">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Contractor Dashboard</h1>
          <p className="text-secondary mb-4">
            Welcome back to {contractorData.companyName}
          </p>
          
          
          <div className="flex space-x-4">
            <Button variant="primary" size="sm">
              Request Funding
            </Button>
            <Button variant="outline" size="sm">
              Submit Progress Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">ACTIVE PROJECTS</div>
            <div className="text-2xl font-bold text-primary mb-1">{contractorData.activeProjects}</div>
            <div className="text-xs text-secondary">Total: {contractorData.totalProjects}</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">CONTRACT VALUE</div>
            <div className="text-2xl font-bold text-primary mb-1">
              {formatCurrency(contractorData.totalContractValue)}
            </div>
            <div className="text-xs text-secondary">Total portfolio</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">PENDING PAYMENTS</div>
            <div className="text-2xl font-bold text-accent-amber mb-1">
              {formatCurrency(contractorData.pendingPayments)}
            </div>
            <div className="text-xs text-secondary">Awaiting release</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">CREDIT UTILIZATION</div>
            <div className="text-2xl font-bold text-primary mb-1">{contractorData.creditUtilization}%</div>
            <div className="text-xs text-success">
              {formatCurrency(contractorData.availableCredit - (contractorData.availableCredit * contractorData.creditUtilization / 100))} available
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="p-6 border-b border-neutral-medium">
                <h2 className="text-xl font-bold text-primary">Recent Activity</h2>
                <p className="text-sm text-secondary">Latest updates on your projects and payments</p>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  {allRecentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-4">
                      <div className="text-2xl">{getActivityIcon(activity.type)}</div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-primary">{activity.title}</h3>
                            <p className="text-sm text-secondary">{activity.description}</p>
                            <p className="text-xs text-secondary mt-1">{activity.project}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-secondary">{formatDate(activity.date)}</div>
                            {activity.amount && (
                              <div className="text-sm font-medium text-success mt-1">
                                {formatCurrency(activity.amount)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className={`text-xs font-medium ${getStatusColor(activity.status)}`}>
                          {activity.status.replace(/_/g, ' ').toUpperCase()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Milestones */}
          <div>
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="p-6 border-b border-neutral-medium">
                <h2 className="text-xl font-bold text-primary">Upcoming Milestones</h2>
                <p className="text-sm text-secondary">Key deliverables and deadlines</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {projectMilestones.map((milestone: any) => {
                    // Find the project name for this milestone
                    const project = contractorProjects.find(p => p.id === milestone.projectId);
                    const projectName = project?.projectName || 'Unknown Project';
                    
                    return (
                      <div 
                        key={milestone.id} 
                        className={`p-4 rounded-lg border-l-4 bg-neutral-medium/30 ${getPriorityColor(milestone.priority)}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-primary text-sm">{milestone.milestone}</h3>
                            <p className="text-xs text-secondary">{projectName}</p>
                          </div>
                          <div className="text-xs text-secondary">{formatDate(milestone.dueDate)}</div>
                        </div>
                        
                        <div className="mb-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-secondary">Progress</span>
                            <span className="text-primary">{milestone.progress}%</span>
                          </div>
                          <div className="w-full bg-neutral-medium rounded-full h-2">
                            <div 
                              className="bg-accent-amber h-2 rounded-full" 
                              style={{ width: `${milestone.progress}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="text-xs text-secondary">
                            Project: {milestone.projectId}
                          </div>
                          <div className={`text-xs font-medium ${getStatusColor(milestone.status)}`}>
                            {milestone.status.replace(/_/g, ' ').toUpperCase()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium mt-6">
              <div className="p-6 border-b border-neutral-medium">
                <h3 className="text-lg font-bold text-primary">Quick Actions</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <Button variant="primary" size="sm" className="w-full justify-start">
                    📊 Submit Progress Report
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    💰 Request Working Capital
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    📄 Upload Documents
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    📞 Schedule Client Meeting
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    📈 View Analytics
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Milestones Timeline */}
        <div className="bg-neutral-dark rounded-lg border border-neutral-medium mt-8">
          <div className="p-6 border-b border-neutral-medium">
            <h2 className="text-xl font-bold text-primary">Financial Timeline</h2>
            <p className="text-sm text-secondary">Billing and payment milestones from Google Sheets</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {financialMilestones.length > 0 ? (
                financialMilestones
                  .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((fm: any) => {
                    const project = contractorProjects.find(p => p.id === fm.project_ID);
                    const projectName = project?.projectName || `Project ${fm.project_ID}`;
                    
                    return (
                      <div key={fm.id} className="flex items-start space-x-4 p-4 rounded-lg bg-neutral-medium/20 border border-neutral-medium">
                        <div className="text-2xl">
                          {fm.transactionType.includes('received') ? '💰' : 
                           fm.transactionType.includes('Disbursed') ? '📤' : 
                           fm.transactionType.includes('Invoice') ? '📄' : '💼'}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold text-primary">{fm.description}</h3>
                              <p className="text-sm text-secondary">{projectName} • {fm.category}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-secondary">{formatDate(fm.date)}</div>
                              <div className="text-sm font-medium text-accent-amber">
                                {formatCurrency(fm.amount)}
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="text-xs text-secondary">
                              Type: {fm.transactionType}
                            </div>
                            {fm.Remarks && (
                              <div className="text-xs text-secondary max-w-xs truncate">
                                {fm.Remarks}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📊</div>
                  <h3 className="text-lg font-semibold text-primary mb-2">No Financial Data</h3>
                  <p className="text-secondary">
                    No financial milestones found. Make sure your FinancialMilestones sheet has data and the project IDs match your projects.
                  </p>
                  <div className="text-xs text-secondary mt-4">
                    Debug: Found {financialMilestones.length} financial milestones
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Project Overview */}
        <div className="bg-neutral-dark rounded-lg border border-neutral-medium mt-8">
          <div className="p-6 border-b border-neutral-medium">
            <h2 className="text-xl font-bold text-primary">Project Overview</h2>
            <p className="text-sm text-secondary">Status of all your active projects</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-medium">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-primary">Project</th>
                  <th className="text-left p-4 text-sm font-medium text-primary">Client</th>
                  <th className="text-right p-4 text-sm font-medium text-primary">Value</th>
                  <th className="text-center p-4 text-sm font-medium text-primary">Progress</th>
                  <th className="text-center p-4 text-sm font-medium text-primary">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-primary">Next Milestone</th>
                </tr>
              </thead>
              <tbody>
                {contractorProjects.map((project) => {
                  // Handle both mock project structure and Google Sheets project structure
                  const isGoogleSheetsProject = 'clientName' in project;
                  const clientName = isGoogleSheetsProject ? 
                    (project as any).clientName : 
                    'Unknown Client';
                  
                  const projectProgress = isGoogleSheetsProject ? 
                    (project as any).currentProgress : 
                    (project as any).progress || 0;

                  const nextMilestone = isGoogleSheetsProject ?
                    { name: (project as any).nextMilestone, expectedDate: (project as any).nextMilestoneDate } :
                    (project as any).milestones?.find((m: any) => m.status === 'In Progress' || m.status === 'Pending');
                  
                  return (
                    <tr key={project.id} className="border-b border-neutral-medium">
                      <td className="p-4">
                        <div className="text-sm font-medium text-primary">{project.projectName}</div>
                        <div className="text-xs text-secondary">{project.id}</div>
                      </td>
                      <td className="p-4 text-sm text-secondary">{clientName}</td>
                      <td className="p-4 text-sm text-primary text-right">{formatCurrency(project.projectValue)}</td>
                      <td className="p-4">
                        <div className="text-center">
                          <div className="text-sm text-primary mb-1">{projectProgress}%</div>
                          <div className="w-full bg-neutral-medium rounded-full h-2">
                            <div 
                              className="bg-accent-amber h-2 rounded-full" 
                              style={{ width: `${projectProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          project.status === 'Active' ? 'bg-success/10 text-success' :
                          project.status === 'Planning' ? 'bg-accent-blue/10 text-accent-blue' :
                          project.status === 'On Hold' ? 'bg-warning/10 text-warning' :
                          project.status === 'Delayed' ? 'bg-error/10 text-error' :
                          project.status === 'Completing' ? 'bg-success/10 text-success' :
                          'bg-neutral-medium text-secondary'
                        }`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {nextMilestone ? (
                          <div>
                            <div className="text-sm text-primary">{nextMilestone.name}</div>
                            <div className="text-xs text-secondary">{formatDate(nextMilestone.expectedDate)}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-secondary">No pending milestones</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ContractorDashboardLayout>
  );
}