'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components';
import { mockProjects, mockContractors, mockClients, getClientById, getContractorById } from '@/data/mockData';

export default function DueDiligenceDocuments(): React.ReactElement {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Get projects for current investor (INV_001)
  const investorProjects = mockProjects.filter(project => 
    project.currentInvestors.includes('INV_001')
  );

  const documentCategories = [
    { id: 'legal', name: 'Legal Documents', icon: '📄' },
    { id: 'financial', name: 'Financial Records', icon: '💰' },
    { id: 'technical', name: 'Technical Specs', icon: '🔧' },
    { id: 'compliance', name: 'Compliance & Permits', icon: '✅' },
    { id: 'insurance', name: 'Insurance & Risk', icon: '🛡️' },
    { id: 'reports', name: 'Progress Reports', icon: '📊' }
  ];

  const generateDocuments = (project: any, client: any, contractor: any) => [
    // Legal Documents
    {
      id: `${project.id}_contract`,
      name: 'Master Service Agreement',
      category: 'legal',
      type: 'PDF',
      size: '2.4 MB',
      uploadDate: '2024-09-15',
      status: 'Verified',
      description: 'Primary contract between client and contractor',
      confidentiality: 'High',
      lastModified: '2024-09-15'
    },
    {
      id: `${project.id}_po`,
      name: 'Purchase Order',
      category: 'legal',
      type: 'PDF',
      size: '856 KB',
      uploadDate: '2024-09-20',
      status: 'Verified',
      description: 'Official purchase order from client',
      confidentiality: 'Medium',
      lastModified: '2024-09-20'
    },
    {
      id: `${project.id}_sow`,
      name: 'Statement of Work',
      category: 'legal',
      type: 'PDF',
      size: '1.8 MB',
      uploadDate: '2024-09-25',
      status: 'Verified',
      description: 'Detailed scope and deliverables',
      confidentiality: 'Medium',
      lastModified: '2024-10-01'
    },

    // Financial Records
    {
      id: `${project.id}_financial_proj`,
      name: 'Financial Projections',
      category: 'financial',
      type: 'XLSX',
      size: '432 KB',
      uploadDate: '2024-09-30',
      status: 'Verified',
      description: 'Detailed financial projections and cash flow',
      confidentiality: 'High',
      lastModified: '2024-11-15'
    },
    {
      id: `${project.id}_bank_guarantee`,
      name: 'Bank Guarantee',
      category: 'financial',
      type: 'PDF',
      size: '1.2 MB',
      uploadDate: '2024-09-28',
      status: 'Verified',
      description: 'Performance guarantee from contractor bank',
      confidentiality: 'High',
      lastModified: '2024-09-28'
    },
    {
      id: `${project.id}_audit_report`,
      name: 'Due Diligence Audit Report',
      category: 'financial',
      type: 'PDF',
      size: '3.1 MB',
      uploadDate: '2024-09-10',
      status: 'Verified',
      description: 'Independent audit of contractor financials',
      confidentiality: 'High',
      lastModified: '2024-09-10'
    },

    // Technical Specifications
    {
      id: `${project.id}_tech_spec`,
      name: 'Technical Specifications',
      category: 'technical',
      type: 'PDF',
      size: '5.2 MB',
      uploadDate: '2024-09-18',
      status: 'Verified',
      description: 'Complete technical requirements and specifications',
      confidentiality: 'Medium',
      lastModified: '2024-10-05'
    },
    {
      id: `${project.id}_architecture`,
      name: 'System Architecture Diagram',
      category: 'technical',
      type: 'PDF',
      size: '2.8 MB',
      uploadDate: '2024-09-22',
      status: 'Verified',
      description: 'System design and architecture overview',
      confidentiality: 'Medium',
      lastModified: '2024-09-22'
    },

    // Compliance & Permits
    {
      id: `${project.id}_permits`,
      name: 'Regulatory Permits',
      category: 'compliance',
      type: 'PDF',
      size: '1.5 MB',
      uploadDate: '2024-09-12',
      status: 'Verified',
      description: 'All required regulatory approvals and permits',
      confidentiality: 'Medium',
      lastModified: '2024-09-12'
    },
    {
      id: `${project.id}_compliance`,
      name: 'Compliance Checklist',
      category: 'compliance',
      type: 'PDF',
      size: '654 KB',
      uploadDate: '2024-09-16',
      status: 'Verified',
      description: 'Industry compliance verification',
      confidentiality: 'Low',
      lastModified: '2024-11-01'
    },

    // Insurance & Risk
    {
      id: `${project.id}_insurance`,
      name: 'Insurance Policy',
      category: 'insurance',
      type: 'PDF',
      size: '987 KB',
      uploadDate: '2024-09-14',
      status: 'Verified',
      description: 'Comprehensive project insurance coverage',
      confidentiality: 'Medium',
      lastModified: '2024-09-14'
    },
    {
      id: `${project.id}_risk_assessment`,
      name: 'Risk Assessment Report',
      category: 'insurance',
      type: 'PDF',
      size: '2.1 MB',
      uploadDate: '2024-09-11',
      status: 'Verified',
      description: 'Detailed project risk analysis',
      confidentiality: 'High',
      lastModified: '2024-09-11'
    },

    // Progress Reports
    {
      id: `${project.id}_progress_nov`,
      name: 'November Progress Report',
      category: 'reports',
      type: 'PDF',
      size: '1.6 MB',
      uploadDate: '2024-12-01',
      status: 'New',
      description: 'Monthly progress and milestone updates',
      confidentiality: 'Medium',
      lastModified: '2024-12-01'
    },
    {
      id: `${project.id}_progress_oct`,
      name: 'October Progress Report',
      category: 'reports',
      type: 'PDF',
      size: '1.4 MB',
      uploadDate: '2024-11-01',
      status: 'Verified',
      description: 'Monthly progress and milestone updates',
      confidentiality: 'Medium',
      lastModified: '2024-11-01'
    }
  ];

  const selectedProjectData = selectedProject ? mockProjects.find(p => p.id === selectedProject) : null;
  const client = selectedProjectData ? getClientById(selectedProjectData.clientId) : null;
  const contractor = selectedProjectData ? getContractorById(selectedProjectData.contractorId) : null;
  
  const documents = selectedProjectData ? generateDocuments(selectedProjectData, client, contractor) : [];
  
  const filteredDocuments = documents.filter(doc => {
    if (selectedCategory !== 'all' && doc.category !== selectedCategory) return false;
    if (searchTerm && !doc.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Verified': return 'bg-success/10 text-success';
      case 'Pending': return 'bg-accent-amber/10 text-accent-amber';
      case 'Expired': return 'bg-warning/10 text-warning';
      case 'New': return 'bg-accent-blue/10 text-accent-blue';
      default: return 'bg-neutral-medium text-secondary';
    }
  };

  const getConfidentialityColor = (level: string) => {
    switch (level) {
      case 'High': return 'text-warning';
      case 'Medium': return 'text-accent-amber';
      case 'Low': return 'text-success';
      default: return 'text-secondary';
    }
  };

  return (
    <DashboardLayout activeTab="documents">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Due Diligence Documents</h1>
          <p className="text-secondary">
            Secure access to project documentation, contracts, and compliance records
          </p>
        </div>

        {/* Project Selection & Filters */}
        <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6 mb-8">
          <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Select Project</label>
              <select 
                value={selectedProject || ''} 
                onChange={(e) => setSelectedProject(e.target.value || null)}
                className="w-full px-3 py-2 bg-neutral-medium border border-neutral-light rounded text-primary text-sm"
              >
                <option value="">Select a project...</option>
                {investorProjects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.projectName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Document Category</label>
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-medium border border-neutral-light rounded text-primary text-sm"
              >
                <option value="all">All Categories</option>
                {documentCategories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Search Documents</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by document name..."
                className="w-full px-3 py-2 bg-neutral-medium border border-neutral-light rounded text-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Quick Actions</label>
              <Button variant="primary" size="sm" disabled={!selectedProject}>
                Download All
              </Button>
            </div>
          </div>
        </div>

        {selectedProject ? (
          <>
            {/* Project Summary */}
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6 mb-8">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-primary mb-2">{selectedProjectData?.projectName}</h2>
                  <div className="grid md:grid-cols-3 gap-6 text-sm">
                    <div>
                      <span className="text-secondary">Client: </span>
                      <span className="text-primary">{client?.name}</span>
                    </div>
                    <div>
                      <span className="text-secondary">Contractor: </span>
                      <span className="text-primary">{contractor?.companyName}</span>
                    </div>
                    <div>
                      <span className="text-secondary">Project Value: </span>
                      <span className="text-primary">₹{(selectedProjectData?.projectValue || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-secondary mb-1">Total Documents</div>
                  <div className="text-2xl font-bold text-primary">{documents.length}</div>
                </div>
              </div>
            </div>

            {/* Document Categories Overview */}
            <div className="grid lg:grid-cols-6 md:grid-cols-3 gap-4 mb-8">
              {documentCategories.map(category => {
                const categoryCount = documents.filter(doc => doc.category === category.id).length;
                return (
                  <div 
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedCategory === category.id 
                        ? 'border-accent-amber bg-accent-amber/5' 
                        : 'border-neutral-medium hover:border-neutral-light'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">{category.icon}</div>
                      <div className="text-sm font-medium text-primary mb-1">{category.name}</div>
                      <div className="text-xs text-secondary">{categoryCount} docs</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Documents Table */}
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="p-6 border-b border-neutral-medium">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-primary">
                    Documents ({filteredDocuments.length})
                  </h3>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      Export List
                    </Button>
                    <Button variant="primary" size="sm">
                      Request Document
                    </Button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                {filteredDocuments.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-neutral-medium">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-primary">Document Name</th>
                        <th className="text-left p-4 text-sm font-medium text-primary">Category</th>
                        <th className="text-left p-4 text-sm font-medium text-primary">Type/Size</th>
                        <th className="text-left p-4 text-sm font-medium text-primary">Upload Date</th>
                        <th className="text-center p-4 text-sm font-medium text-primary">Status</th>
                        <th className="text-center p-4 text-sm font-medium text-primary">Confidentiality</th>
                        <th className="text-center p-4 text-sm font-medium text-primary">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocuments.map((doc) => (
                        <tr key={doc.id} className="border-b border-neutral-medium hover:bg-neutral-medium/30">
                          <td className="p-4">
                            <div className="text-sm font-medium text-primary">{doc.name}</div>
                            <div className="text-xs text-secondary">{doc.description}</div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">
                                {documentCategories.find(cat => cat.id === doc.category)?.icon}
                              </span>
                              <span className="text-sm text-secondary">
                                {documentCategories.find(cat => cat.id === doc.category)?.name}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm text-primary">{doc.type}</div>
                            <div className="text-xs text-secondary">{doc.size}</div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm text-primary">{new Date(doc.uploadDate).toLocaleDateString()}</div>
                            <div className="text-xs text-secondary">Modified: {new Date(doc.lastModified).toLocaleDateString()}</div>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(doc.status)}`}>
                              {doc.status}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`text-sm font-medium ${getConfidentialityColor(doc.confidentiality)}`}>
                              {doc.confidentiality}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center space-x-2">
                              <Button variant="outline" size="sm">
                                View
                              </Button>
                              <Button variant="primary" size="sm">
                                Download
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-12 text-center">
                    <div className="text-6xl mb-4">📁</div>
                    <h3 className="text-xl font-bold text-primary mb-2">No Documents Found</h3>
                    <p className="text-secondary">
                      {searchTerm ? 'No documents match your search criteria.' : 
                       selectedCategory !== 'all' ? 'No documents in this category.' :
                       'No documents available for the selected filters.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-bold text-primary mb-2">Select a Project</h3>
            <p className="text-secondary mb-6">
              Choose one of your invested projects to access its due diligence documents, 
              contracts, compliance records, and progress reports.
            </p>
            <div className="text-sm text-secondary">
              You have access to documents for {investorProjects.length} active projects
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}