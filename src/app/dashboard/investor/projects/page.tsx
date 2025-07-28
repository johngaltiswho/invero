'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components';
import { mockProjects, mockClients, mockContractors, getClientById, getContractorById } from '@/data/mockData';

export default function ProjectMonitoring(): React.ReactElement {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'timeline' | 'financials'>('overview');

  // Get projects for current investor (INV_001 - Rajesh Sharma)
  const investorProjects = mockProjects.filter(project => 
    project.currentInvestors.includes('INV_001')
  );

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
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const selectedProjectData = selectedProject ? mockProjects.find(p => p.id === selectedProject) : null;
  const client = selectedProjectData ? getClientById(selectedProjectData.clientId) : null;
  const contractor = selectedProjectData ? getContractorById(selectedProjectData.contractorId) : null;

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
            <div className="text-2xl font-bold text-primary mb-1">₹1.75 Cr</div>
            <div className="text-xs text-success">Across {investorProjects.length} projects</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">AVG PROGRESS</div>
            <div className="text-2xl font-bold text-accent-amber mb-1">
              {Math.round(investorProjects.reduce((sum, p) => sum + p.progress, 0) / investorProjects.length)}%
            </div>
            <div className="text-xs text-secondary">Weighted average</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">NEXT PAYOUT</div>
            <div className="text-2xl font-bold text-primary mb-1">Dec 15</div>
            <div className="text-xs text-secondary">₹1.5L expected</div>
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
                  {investorProjects.map((project) => {
                    const client = getClientById(project.clientId);
                    const contractor = getContractorById(project.contractorId);
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
                        <p className="text-xs text-secondary mb-2">{client?.name}</p>
                        <div className="flex justify-between text-xs">
                          <span className="text-secondary">Progress</span>
                          <span className="text-primary">{project.progress}%</span>
                        </div>
                        <div className="w-full bg-neutral-medium rounded-full h-1 mt-1">
                          <div 
                            className="bg-accent-amber h-1 rounded-full" 
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
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
                        <span>Client: {client?.name}</span>
                        <span>•</span>
                        <span>Contractor: {contractor?.companyName}</span>
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
                    {['overview', 'timeline', 'financials'].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode as any)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          viewMode === mode
                            ? 'bg-accent-amber text-primary'
                            : 'text-secondary hover:text-primary'
                        }`}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    ))}
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
                            ₹50 Lakh
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-secondary mb-1">Expected IRR</div>
                          <div className="text-lg font-bold text-accent-amber">
                            {selectedProjectData.expectedIRR}%
                          </div>
                        </div>
                      </div>

                      {/* Progress Overview */}
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-secondary">Overall Progress</span>
                          <span className="text-primary">{selectedProjectData.progress}%</span>
                        </div>
                        <div className="w-full bg-neutral-medium rounded-full h-3">
                          <div 
                            className="bg-accent-amber h-3 rounded-full" 
                            style={{ width: `${selectedProjectData.progress}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Project Description */}
                      <div>
                        <h3 className="text-sm font-semibold text-primary mb-2">Project Description</h3>
                        <p className="text-sm text-secondary leading-relaxed">
                          {selectedProjectData.description}
                        </p>
                      </div>

                      {/* Client & Contractor Info */}
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="text-sm font-semibold text-primary mb-3">Client Information</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-secondary">Company</span>
                              <span className="text-primary">{client?.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">Type</span>
                              <span className="text-primary">{client?.type}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">Credit Rating</span>
                              <span className="text-success">{client?.creditRating}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">Payment Cycle</span>
                              <span className="text-primary">{client?.avgPaymentCycle} days</span>
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
                              <span className="text-primary">₹50,00,000</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">Expected Returns</span>
                              <span className="text-accent-amber">₹57,40,000</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">IRR</span>
                              <span className="text-accent-amber">{selectedProjectData.expectedIRR}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">Tenure</span>
                              <span className="text-primary">{selectedProjectData.tenure} months</span>
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