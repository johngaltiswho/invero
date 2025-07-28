'use client';

import React, { useState } from 'react';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';
import { Button } from '@/components';
import { mockProjects, mockClients, getClientById, getProjectsByContractor } from '@/data/mockData';

export default function ContractorDashboard(): React.ReactElement {
  // Mock contractor ID - in real app this would come from auth
  const currentContractorId = 'CONTRACTOR_001';
  
  // Get projects for current contractor
  const contractorProjects = getProjectsByContractor(currentContractorId);
  
  const contractorData = {
    companyName: 'TechnoMax Solutions Pvt Ltd',
    totalProjects: contractorProjects.length,
    activeProjects: contractorProjects.filter(p => p.status === 'Active').length,
    totalContractValue: contractorProjects.reduce((sum, p) => sum + p.projectValue, 0),
    pendingPayments: 2850000,
    nextMilestone: 'System Integration - Dec 15',
    creditUtilization: 42,
    availableCredit: 15000000
  };

  const recentActivity = [
    {
      id: 'ACT_001',
      type: 'milestone_completed',
      title: 'Milestone Completed',
      description: 'Equipment Procurement milestone completed for Tata Motors project',
      date: '2024-12-01',
      project: 'Smart Manufacturing - Tata Motors',
      amount: 1050000,
      status: 'payment_released'
    },
    {
      id: 'ACT_002',
      type: 'payment_received',
      title: 'Payment Received',
      description: 'Advance payment received for HCL Tech project',
      date: '2024-11-30',
      project: 'Digital Infrastructure - HCL Tech',
      amount: 550000,
      status: 'completed'
    },
    {
      id: 'ACT_003',
      type: 'document_uploaded',
      title: 'Document Uploaded',
      description: 'Progress report uploaded for November milestone',
      date: '2024-11-28',
      project: 'Smart Manufacturing - Tata Motors',
      status: 'pending_review'
    },
    {
      id: 'ACT_004',
      type: 'funding_request',
      title: 'Funding Request Approved',
      description: 'Working capital request of ₹25L approved',
      date: '2024-11-25',
      project: 'Digital Infrastructure - HCL Tech',
      amount: 2500000,
      status: 'approved'
    }
  ];

  const upcomingMilestones = [
    {
      id: 'MS_002',
      projectName: 'Smart Manufacturing - Tata Motors',
      milestone: 'System Integration',
      dueDate: '2024-12-15',
      progress: 85,
      paymentAmount: 1050000,
      status: 'on_track',
      priority: 'high'
    },
    {
      id: 'MS_006',
      projectName: 'Digital Infrastructure - HCL Tech',
      milestone: 'System Deployment',
      dueDate: '2025-02-15',
      progress: 25,
      paymentAmount: 748000,
      status: 'planning',
      priority: 'medium'
    },
    {
      id: 'MS_010',
      projectName: 'Industrial Automation - Mahindra',
      milestone: 'Equipment Procurement',
      dueDate: '2025-04-30',
      progress: 0,
      paymentAmount: 5000000,
      status: 'pending',
      priority: 'low'
    }
  ];

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
                  {recentActivity.map((activity) => (
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
                  {upcomingMilestones.map((milestone) => (
                    <div 
                      key={milestone.id} 
                      className={`p-4 rounded-lg border-l-4 bg-neutral-medium/30 ${getPriorityColor(milestone.priority)}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-primary text-sm">{milestone.milestone}</h3>
                          <p className="text-xs text-secondary">{milestone.projectName}</p>
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
                          Payment: {formatCurrency(milestone.paymentAmount)}
                        </div>
                        <div className={`text-xs font-medium ${getStatusColor(milestone.status)}`}>
                          {milestone.status.replace(/_/g, ' ').toUpperCase()}
                        </div>
                      </div>
                    </div>
                  ))}
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
                  const client = getClientById(project.clientId);
                  const nextMilestone = project.milestones.find(m => m.status === 'In Progress' || m.status === 'Pending');
                  
                  return (
                    <tr key={project.id} className="border-b border-neutral-medium">
                      <td className="p-4">
                        <div className="text-sm font-medium text-primary">{project.projectName}</div>
                        <div className="text-xs text-secondary">{project.id}</div>
                      </td>
                      <td className="p-4 text-sm text-secondary">{client?.name}</td>
                      <td className="p-4 text-sm text-primary text-right">{formatCurrency(project.projectValue)}</td>
                      <td className="p-4">
                        <div className="text-center">
                          <div className="text-sm text-primary mb-1">{project.progress}%</div>
                          <div className="w-full bg-neutral-medium rounded-full h-2">
                            <div 
                              className="bg-accent-amber h-2 rounded-full" 
                              style={{ width: `${project.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          project.status === 'Active' ? 'bg-success/10 text-success' :
                          project.status === 'Planning' ? 'bg-accent-blue/10 text-accent-blue' :
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