'use client';

import React, { useState } from 'react';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';
import { Button, Input } from '@/components';
import { mockProjects, mockClients, getClientById, getProjectsByContractor } from '@/data/mockData';

export default function ProgressReports(): React.ReactElement {
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedMilestone, setSelectedMilestone] = useState('');
  const [reportType, setReportType] = useState<'milestone' | 'monthly'>('milestone');
  const currentContractorId = 'CONTRACTOR_001';
  
  // Get projects for current contractor
  const contractorProjects = getProjectsByContractor(currentContractorId).filter(p => p.status === 'Active');

  const [formData, setFormData] = useState({
    progressPercentage: '',
    workCompleted: '',
    challenges: '',
    nextSteps: '',
    additionalNotes: '',
    documentsUploaded: false
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const selectedProjectData = selectedProject ? contractorProjects.find(p => p.id === selectedProject) : null;
  const availableMilestones = selectedProjectData ? 
    selectedProjectData.milestones.filter(m => m.status === 'In Progress' || m.status === 'Pending') : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    alert('Progress report submitted successfully!');
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <ContractorDashboardLayout activeTab="progress">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Progress Reports</h1>
          <p className="text-secondary">
            Submit milestone updates and monthly progress reports
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">PENDING REPORTS</div>
            <div className="text-2xl font-bold text-warning mb-1">3</div>
            <div className="text-xs text-secondary">Due this month</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">SUBMITTED</div>
            <div className="text-2xl font-bold text-success mb-1">12</div>
            <div className="text-xs text-secondary">This year</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">ON SCHEDULE</div>
            <div className="text-2xl font-bold text-success mb-1">85%</div>
            <div className="text-xs text-secondary">Milestone completion</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">NEXT DUE</div>
            <div className="text-2xl font-bold text-primary mb-1">Dec 15</div>
            <div className="text-xs text-secondary">System Integration</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Report Form */}
          <div className="lg:col-span-2">
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="p-6 border-b border-neutral-medium">
                <h2 className="text-xl font-bold text-primary">Submit Progress Report</h2>
                <p className="text-sm text-secondary">Update project progress and milestone status</p>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6">
                {/* Report Type Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-primary mb-3">Report Type</label>
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => setReportType('milestone')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        reportType === 'milestone'
                          ? 'bg-accent-amber text-primary'
                          : 'bg-neutral-medium text-secondary hover:text-primary'
                      }`}
                    >
                      📋 Milestone Report
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportType('monthly')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        reportType === 'monthly'
                          ? 'bg-accent-amber text-primary'
                          : 'bg-neutral-medium text-secondary hover:text-primary'
                      }`}
                    >
                      📅 Monthly Report
                    </button>
                  </div>
                </div>

                {/* Project Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-primary mb-2">Select Project</label>
                  <select 
                    value={selectedProject} 
                    onChange={(e) => {
                      setSelectedProject(e.target.value);
                      setSelectedMilestone('');
                    }}
                    className="w-full px-3 py-2 bg-neutral-medium border border-neutral-light rounded text-primary"
                    required
                  >
                    <option value="">Choose a project...</option>
                    {contractorProjects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.projectName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Milestone Selection (for milestone reports) */}
                {reportType === 'milestone' && selectedProject && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-primary mb-2">Select Milestone</label>
                    <select 
                      value={selectedMilestone} 
                      onChange={(e) => setSelectedMilestone(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-medium border border-neutral-light rounded text-primary"
                      required
                    >
                      <option value="">Choose a milestone...</option>
                      {availableMilestones.map(milestone => (
                        <option key={milestone.id} value={milestone.id}>
                          {milestone.name} - Due {formatDate(milestone.expectedDate)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Progress Percentage */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-primary mb-2">
                    {reportType === 'milestone' ? 'Milestone Progress' : 'Overall Progress'} (%)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progressPercentage}
                    onChange={(e) => handleInputChange('progressPercentage', e.target.value)}
                    placeholder="Enter completion percentage"
                    required
                  />
                </div>

                {/* Work Completed */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-primary mb-2">Work Completed</label>
                  <textarea
                    value={formData.workCompleted}
                    onChange={(e) => handleInputChange('workCompleted', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-medium border border-neutral-light rounded text-primary h-24 resize-none"
                    placeholder="Describe the work completed during this period..."
                    required
                  />
                </div>

                {/* Challenges */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-primary mb-2">Challenges & Issues</label>
                  <textarea
                    value={formData.challenges}
                    onChange={(e) => handleInputChange('challenges', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-medium border border-neutral-light rounded text-primary h-20 resize-none"
                    placeholder="Any challenges or issues encountered..."
                  />
                </div>

                {/* Next Steps */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-primary mb-2">Next Steps</label>
                  <textarea
                    value={formData.nextSteps}
                    onChange={(e) => handleInputChange('nextSteps', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-medium border border-neutral-light rounded text-primary h-20 resize-none"
                    placeholder="Planned activities for the next period..."
                    required
                  />
                </div>

                {/* Additional Notes */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-primary mb-2">Additional Notes</label>
                  <textarea
                    value={formData.additionalNotes}
                    onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-medium border border-neutral-light rounded text-primary h-20 resize-none"
                    placeholder="Any additional information or notes..."
                  />
                </div>

                {/* Document Upload */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-primary mb-2">Supporting Documents</label>
                  <div className="border-2 border-dashed border-neutral-medium rounded-lg p-6 text-center">
                    <div className="text-4xl mb-2">📎</div>
                    <p className="text-sm text-secondary mb-2">
                      Drop files here or click to upload
                    </p>
                    <Button variant="outline" size="sm" type="button">
                      Choose Files
                    </Button>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex space-x-4">
                  <Button variant="primary" type="submit" disabled={!selectedProject}>
                    Submit Report
                  </Button>
                  <Button variant="outline" type="button">
                    Save as Draft
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Recent Reports & Guidelines */}
          <div>
            {/* Recent Reports */}
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium mb-6">
              <div className="p-6 border-b border-neutral-medium">
                <h3 className="text-lg font-bold text-primary">Recent Reports</h3>
                <p className="text-sm text-secondary">Your latest submissions</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="p-3 bg-neutral-medium/30 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-medium text-primary">Milestone Report</div>
                      <div className="text-xs text-success">Approved</div>
                    </div>
                    <div className="text-xs text-secondary">
                      Equipment Procurement - Nov 28, 2024
                    </div>
                  </div>
                  
                  <div className="p-3 bg-neutral-medium/30 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-medium text-primary">Monthly Report</div>
                      <div className="text-xs text-accent-blue">Under Review</div>
                    </div>
                    <div className="text-xs text-secondary">
                      November 2024 - Nov 30, 2024
                    </div>
                  </div>
                  
                  <div className="p-3 bg-neutral-medium/30 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-medium text-primary">Milestone Report</div>
                      <div className="text-xs text-success">Approved</div>
                    </div>
                    <div className="text-xs text-secondary">
                      Installation Phase - Oct 15, 2024
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Guidelines */}
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="p-6 border-b border-neutral-medium">
                <h3 className="text-lg font-bold text-primary">Reporting Guidelines</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3 text-sm text-secondary">
                  <div className="flex items-start space-x-2">
                    <span className="text-accent-amber">•</span>
                    <span>Submit milestone reports within 24 hours of completion</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-accent-amber">•</span>
                    <span>Monthly reports are due by the 5th of each month</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-accent-amber">•</span>
                    <span>Include supporting photos and documents</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-accent-amber">•</span>
                    <span>Be specific about challenges and mitigation plans</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-accent-amber">•</span>
                    <span>Reports are reviewed within 2-3 business days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ContractorDashboardLayout>
  );
}