'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { LoadingSpinner } from '@/components';
import { useInvestor } from '@/contexts/InvestorContext';

export default function ProjectMonitoring(): React.ReactElement {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'timeline' | 'financials'>('overview');
  const { investor, loading } = useInvestor();

  // Get projects that the investor has actually invested in
  const getInvestorProjects = () => {
    if (!investor || !investor.investments || !investor.relatedProjects) {
      return [];
    }

    // Get project IDs that the investor has invested in
    const investedProjectIds = [
      ...new Set(
        investor.investments
          .map(inv => inv.projectId || inv.project_id)
          .filter(Boolean)
      )
    ];
    
    // Filter related projects to only show invested ones
    const investorProjects = investor.relatedProjects.filter(project => 
      investedProjectIds.includes(project.id)
    );

    // Add normalized and investment data to each project
    return investorProjects.map(project => {
      const projectInvestments = investor.investments.filter(
        inv => (inv.projectId || inv.project_id) === project.id
      );
      const totalInvestment = projectInvestments.reduce(
        (sum, inv) => sum + (inv.investmentAmount || inv.investment_amount || 0),
        0
      );
      const avgIRR =
        projectInvestments.length > 0
          ? projectInvestments.reduce(
              (sum, inv) => sum + (inv.expectedReturn || inv.expected_return || 0),
              0
            ) / projectInvestments.length
          : 0;
      
      return {
        ...project,
        projectName: project.projectName || project.project_name || 'Unnamed Project',
        clientName: project.clientName || project.client_name || 'Client TBD',
        contractorId: project.contractorId || project.contractor_id || '',
        status: project.status || project.project_status || 'Active',
        riskRating: project.riskRating || project.risk_level || 'Medium',
        currentProgress:
          project.currentProgress ??
          project.schedule_progress ??
          project.current_progress ??
          0,
        projectValue:
          project.projectValue ??
          project.estimated_value ??
          project.project_value ??
          0,
        myInvestment: totalInvestment,
        myExpectedIRR: avgIRR,
        investmentCount: projectInvestments.length,
        investments: projectInvestments
      };
    });
  };

  const investorProjects = getInvestorProjects();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'text-success';
      case 'Planning': return 'text-accent-blue';
      case 'On Hold': return 'text-warning';
      case 'Completed': return 'text-accent-amber';
      case 'Cancelled': return 'text-warning';
      default: return 'text-secondary';
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

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-success';
      case 'Medium': return 'text-accent-amber';
      case 'High': return 'text-warning';
      default: return 'text-secondary';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString.trim() === '') {
      return 'Date not set';
    }

    try {
      let date: Date;
      
      // Handle DD/MM/YYYY format (common in Indian data)
      if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // Month is 0-indexed
          const year = parseInt(parts[2]);
          date = new Date(year, month, day);
        } else {
          date = new Date(dateString);
        }
      } else {
        date = new Date(dateString);
      }

      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }

      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Failed to format date', error);
      return 'Invalid date';
    }
  };

  const selectedProjectData = selectedProject ? investorProjects.find(p => p.id === selectedProject) : null;
  
  // Find contractor from investor data
  const contractor = selectedProjectData ? 
    investor?.relatedContractors?.find(c => c.id === selectedProjectData.contractorId) ||
    investor?.allContractors?.find(c => c.id === selectedProjectData.contractorId) : null;

  if (loading) {
    return (
      <DashboardLayout activeTab="projects">
        <div className="p-6">
          <LoadingSpinner 
            title="Loading Your Portfolio"
            description="Gathering real-time data from your investments, project progress, and contractor information"
            icon="📊"
            fullScreen={true}
            steps={[
              "Fetching investment data...",
              "Loading project updates...",
              "Synchronizing contractor information..."
            ]}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeTab="projects">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Project Monitoring</h1>
          <p className="text-secondary">
            Real-time tracking of your project investments and milestone progress
          </p>
        </div>

        {/* Project Overview Cards */}
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">ACTIVE PROJECTS</div>
            <div className="text-2xl font-bold text-primary mb-1">
              {investorProjects.filter(p => p.status === 'Active').length}
            </div>
            <div className="text-xs text-secondary">Total projects: {investorProjects.length}</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">TOTAL INVESTED</div>
            <div className="text-2xl font-bold text-primary mb-1">
              {formatCurrency(investorProjects.reduce((sum, p) => sum + p.myInvestment, 0))}
            </div>
            <div className="text-xs text-success">Across {investorProjects.length} projects</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">AVG PROGRESS</div>
            <div className="text-2xl font-bold text-accent-amber mb-1">
              {investorProjects.length > 0 ? 
                Math.round(investorProjects.reduce((sum, p) => sum + (p.currentProgress || 0), 0) / investorProjects.length) 
                : 0}%
            </div>
            <div className="text-xs text-secondary">Weighted average</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">AVG EXPECTED IRR</div>
            <div className="text-2xl font-bold text-primary mb-1">
              {investorProjects.length > 0 ? 
                (investorProjects.reduce((sum, p) => sum + (p.myExpectedIRR || 0), 0) / investorProjects.length).toFixed(1) 
                : 0}%
            </div>
            <div className="text-xs text-secondary">Portfolio average</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Projects List */}
          <div className="lg:col-span-1">
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="p-6 border-b border-neutral-medium">
                <h2 className="text-xl font-bold text-primary">Your Projects</h2>
                <p className="text-sm text-secondary">Select a project to view details</p>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {investorProjects.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">📊</div>
                      <h3 className="text-lg font-semibold text-primary mb-2">No Projects Yet</h3>
                      <p className="text-secondary text-sm">
                        You haven&apos;t invested in any projects yet. Visit the opportunities section to find projects to invest in.
                      </p>
                    </div>
                  ) : (
                    investorProjects.map((project) => {
                      const contractorId = project.contractorId || project.contractor_id;
                      const projectContractor = investor?.relatedContractors?.find(c => c.id === contractorId) ||
                                                investor?.allContractors?.find(c => c.id === contractorId);
                      return (
                        <div
                          key={project.id}
                          onClick={() => setSelectedProject(project.id)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all ${
                            selectedProject === project.id
                              ? 'border-accent-amber bg-accent-amber/5'
                              : 'border-neutral-medium hover:border-neutral-light'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-primary text-sm leading-tight">
                              {project.projectName}
                            </h3>
                            <span className={`text-xs font-medium ${getStatusColor(project.status)}`}>
                              {project.status}
                            </span>
                          </div>
                          <p className="text-xs text-secondary mb-2">
                            Client: {project.clientName} • Contractor: {projectContractor?.companyName || 'Unknown'}
                          </p>
                          <div className="flex justify-between text-xs mb-2">
                            <span className="text-secondary">My Investment</span>
                            <span className="text-accent-amber font-semibold">{formatCurrency(project.myInvestment)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-secondary">Progress</span>
                            <span className="text-primary">{project.currentProgress || 0}%</span>
                          </div>
                          <div className="w-full bg-neutral-medium rounded-full h-1 mt-1">
                            <div 
                              className="bg-accent-amber h-1 rounded-full" 
                              style={{ width: `${project.currentProgress || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div className="lg:col-span-2">
            {selectedProjectData ? (
              <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
                <div className="p-6 border-b border-neutral-medium">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-primary mb-2">
                        {selectedProjectData.projectName}
                      </h2>
                      <div className="flex items-center space-x-4 text-sm text-secondary">
                        <span>Client: {selectedProjectData.clientName}</span>
                        <span>•</span>
                        <span>Contractor: {contractor?.companyName || 'Unknown'}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        selectedProjectData.status === 'Active' 
                          ? 'bg-success/10 text-success'
                          : 'bg-accent-blue/10 text-accent-blue'
                      }`}>
                        {selectedProjectData.status}
                      </span>
                      <span className={`text-sm font-semibold ${getRiskColor(selectedProjectData.riskRating)}`}>
                        {selectedProjectData.riskRating} Risk
                      </span>
                    </div>
                  </div>

                  {/* View Mode Tabs */}
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setViewMode('overview')}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        viewMode === 'overview'
                          ? 'bg-accent-amber text-primary'
                          : 'text-secondary hover:text-primary'
                      }`}
                    >
                      Overview
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {viewMode === 'overview' && (
                    <div className="space-y-6">
                      {/* Key Metrics */}
                      <div className="grid md:grid-cols-3 gap-6">
                        <div>
                          <div className="text-xs text-secondary mb-1">Project Value</div>
                          <div className="text-lg font-bold text-primary">
                            {formatCurrency(selectedProjectData.projectValue)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-secondary mb-1">Your Investment</div>
                          <div className="text-lg font-bold text-accent-amber">
                            {formatCurrency(selectedProjectData.myInvestment)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-secondary mb-1">Expected IRR</div>
                          <div className="text-lg font-bold text-accent-amber">
                            {selectedProjectData.myExpectedIRR?.toFixed(1) || 0}%
                          </div>
                        </div>
                      </div>

                      {/* Progress Overview */}
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-secondary">Overall Progress</span>
                          <span className="text-primary">{selectedProjectData.currentProgress || 0}%</span>
                        </div>
                        <div className="w-full bg-neutral-medium rounded-full h-3">
                          <div 
                            className="bg-accent-amber h-3 rounded-full" 
                            style={{ width: `${selectedProjectData.currentProgress || 0}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Project Details */}
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="text-sm font-semibold text-primary mb-3">Project Information</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-secondary">Client</span>
                              <span className="text-primary">{selectedProjectData.clientName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">Status</span>
                              <span className="text-primary">{selectedProjectData.status}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">Priority</span>
                              <span className="text-primary">{selectedProjectData.priority}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">Team Size</span>
                              <span className="text-primary">{selectedProjectData.teamSize} members</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">Next Milestone</span>
                              <span className="text-primary">{selectedProjectData.nextMilestone || 'TBD'}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-primary mb-3">Contractor Information</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-secondary">Company</span>
                              <span className="text-primary">{contractor?.companyName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">Experience</span>
                              <span className="text-primary">{contractor?.yearsInBusiness} years</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">Success Rate</span>
                              <span className="text-success">{contractor?.successRate}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">Credit Score</span>
                              <span className="text-success">{contractor?.creditScore}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {viewMode === 'timeline' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-bold text-primary">Project Timeline & Milestones</h3>
                      <div className="space-y-4">
                        {selectedProjectData.milestones.map((milestone, index) => (
                          <div key={milestone.id} className="flex items-start space-x-4">
                            <div className="flex flex-col items-center">
                              <div className={`w-4 h-4 rounded-full ${
                                milestone.status === 'Completed' ? 'bg-success' :
                                milestone.status === 'In Progress' ? 'bg-accent-blue' :
                                milestone.status === 'Delayed' ? 'bg-warning' : 'bg-neutral-medium'
                              }`}></div>
                              {index < selectedProjectData.milestones.length - 1 && (
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
                                  <span className="text-secondary">Expected: </span>
                                  <span className="text-primary">{formatDate(milestone.expectedDate)}</span>
                                </div>
                                {milestone.actualDate && (
                                  <div>
                                    <span className="text-secondary">Actual: </span>
                                    <span className="text-primary">{formatDate(milestone.actualDate)}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-secondary">Progress: </span>
                                  <span className="text-primary">{milestone.percentage}%</span>
                                </div>
                                <div>
                                  <span className="text-secondary">Payment: </span>
                                  <span className="text-accent-amber">{milestone.paymentPercentage}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewMode === 'financials' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-bold text-primary">Financial Overview</h3>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-primary">Project Financials</h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-secondary">Total Project Value</span>
                              <span className="text-primary">{formatCurrency(selectedProjectData.projectValue)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">Funding Required</span>
                              <span className="text-primary">{formatCurrency(selectedProjectData.fundingRequired)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">Funding Received</span>
                              <span className="text-success">{formatCurrency(selectedProjectData.fundingReceived)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">Funding Gap</span>
                              <span className="text-warning">{formatCurrency(selectedProjectData.fundingRequired - selectedProjectData.fundingReceived)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-primary">Your Investment</h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-secondary">Investment Amount</span>
                              <span className="text-primary">{formatCurrency(selectedProjectData.myInvestment)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">Expected Returns</span>
                              <span className="text-accent-amber">{formatCurrency(selectedProjectData.myInvestment * (1 + (selectedProjectData.myExpectedIRR || 0) / 100))}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">IRR</span>
                              <span className="text-accent-amber">{selectedProjectData.myExpectedIRR?.toFixed(1) || 0}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">Tenure</span>
                              <span className="text-primary">{selectedProjectData.projectTenure || 'TBD'} months</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-primary mb-3">Payment Schedule</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between py-2 border-b border-neutral-medium text-sm">
                            <span className="text-secondary">Dec 31, 2024</span>
                            <span className="text-primary">Interest Payment</span>
                            <span className="text-accent-amber">₹61,667</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-neutral-medium text-sm">
                            <span className="text-secondary">Jan 31, 2025</span>
                            <span className="text-primary">Interest Payment</span>
                            <span className="text-accent-amber">₹61,667</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-neutral-medium text-sm">
                            <span className="text-secondary">Jun 30, 2025</span>
                            <span className="text-primary">Final Payment</span>
                            <span className="text-accent-amber">₹54,07,000</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-12 text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-primary mb-2">Select a Project</h3>
                <p className="text-secondary">
                  Choose a project from the list to view detailed monitoring information, 
                  timelines, and financial data.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
