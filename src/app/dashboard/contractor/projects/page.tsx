'use client';

import React, { useState } from 'react';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';
import { Button } from '@/components';
import { mockProjects, mockClients, getClientById, getProjectsByContractor } from '@/data/mockData';

export default function ContractorProjects(): React.ReactElement {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const currentContractorId = 'CONTRACTOR_001';
  
  // Get projects for current contractor
  const contractorProjects = getProjectsByContractor(currentContractorId);

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

  const selectedProjectData = selectedProject ? contractorProjects.find(p => p.id === selectedProject) : null;
  const client = selectedProjectData ? getClientById(selectedProjectData.clientId) : null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-success/10 text-success';
      case 'Planning': return 'bg-accent-blue/10 text-accent-blue';
      case 'On Hold': return 'bg-warning/10 text-warning';
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
              {Math.round(contractorProjects.reduce((sum, p) => sum + p.progress, 0) / contractorProjects.length)}%
            </div>
            <div className="text-xs text-secondary">Across all projects</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Projects List */}
          <div className="lg:col-span-1">
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="p-6 border-b border-neutral-medium">
                <h2 className="text-xl font-bold text-primary">Project List</h2>
                <p className="text-sm text-secondary">Select a project to view details</p>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {contractorProjects.map((project) => {
                    const client = getClientById(project.clientId);
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
                          <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(project.status)}`}>
                            {project.status}
                          </span>
                        </div>
                        <p className="text-xs text-secondary mb-2">{client?.name}</p>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-secondary">Progress</span>
                          <span className="text-primary">{project.progress}%</span>
                        </div>
                        <div className="w-full bg-neutral-medium rounded-full h-1">
                          <div 
                            className="bg-accent-amber h-1 rounded-full" 
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs mt-2">
                          <span className="text-secondary">Value</span>
                          <span className="text-primary">{formatCurrency(project.projectValue)}</span>
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
                        <span>Project ID: {selectedProjectData.id}</span>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <Button variant="outline" size="sm">
                        Update Progress
                      </Button>
                      <Button variant="primary" size="sm">
                        Submit Report
                      </Button>
                    </div>
                  </div>

                  {/* Project Metrics */}
                  <div className="grid md:grid-cols-4 gap-6">
                    <div>
                      <div className="text-xs text-secondary mb-1">Project Value</div>
                      <div className="text-lg font-bold text-primary">
                        {formatCurrency(selectedProjectData.projectValue)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-secondary mb-1">Current Progress</div>
                      <div className="text-lg font-bold text-accent-amber">
                        {selectedProjectData.progress}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-secondary mb-1">End Date</div>
                      <div className="text-lg font-bold text-primary">
                        {formatDate(selectedProjectData.expectedEndDate)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-secondary mb-1">Status</div>
                      <div className={`text-sm font-medium px-2 py-1 rounded inline-block ${getStatusColor(selectedProjectData.status)}`}>
                        {selectedProjectData.status}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {/* Project Description */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-primary mb-2">Project Description</h3>
                    <p className="text-sm text-secondary leading-relaxed">
                      {selectedProjectData.description}
                    </p>
                  </div>

                  {/* Milestones */}
                  <div>
                    <h3 className="text-lg font-bold text-primary mb-4">Project Milestones</h3>
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
                </div>
              </div>
            ) : (
              <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-12 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-bold text-primary mb-2">Select a Project</h3>
                <p className="text-secondary">
                  Choose a project from the list to view detailed information, 
                  track milestones, and manage progress.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ContractorDashboardLayout>
  );
}