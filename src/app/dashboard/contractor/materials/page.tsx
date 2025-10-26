'use client';

import React, { useState, useEffect } from 'react';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';
import { Button, Input } from '@/components';

interface Material {
  id: string;
  material_code?: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  brand?: string;
  grade_specification?: string;
  unit: string;
  estimated_price?: number;
  approval_status?: 'pending' | 'approved' | 'rejected';
  requested_by?: string;
  approved_by?: string;
  approval_date?: string;
  rejection_reason?: string;
  justification?: string;
  project_context?: string;
  urgency?: 'low' | 'normal' | 'high' | 'urgent';
  purchase_status?: string;
  vendor_id?: string;
  purchase_quantity?: number;
  estimated_rate?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}


interface Vendor {
  id: number | string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialRequests, setMaterialRequests] = useState<Material[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('materials');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [requestSortField, setRequestSortField] = useState<string>('created_at');
  const [requestSortDirection, setRequestSortDirection] = useState<'asc' | 'desc'>('desc');

  const [newRequest, setNewRequest] = useState({
    name: '',
    description: '',
    category: '',
    unit: '',
    project_id: '',
    urgency: 'normal'
  });


  // Common units for construction materials
  const unitOptions = [
    'bags', 'tons', 'cubic meters', 'square meters', 'meters', 'pieces', 'kilograms', 
    'liters', 'boxes', 'rolls', 'sheets', 'numbers', 'cubic feet', 'square feet', 'feet'
  ];

  // Fetch materials and requests
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch materials
        const materialsResponse = await fetch('/api/materials');
        const materialsResult = await materialsResponse.json();
        
        if (materialsResult.success) {
          setMaterials(materialsResult.data);
          const uniqueCategories = [...new Set(materialsResult.data.map((m: Material) => m.category))] as string[];
          setCategories(uniqueCategories);
        }

        // Fetch vendors for purchase status display
        try {
          const vendorsResponse = await fetch('/api/vendors');
          const vendorsResult = await vendorsResponse.json();
          
          if (vendorsResult.success) {
            setVendors(vendorsResult.data || []);
          } else {
            console.warn('Failed to fetch vendors:', vendorsResult.error);
          }
        } catch (vendorError) {
          console.warn('Error fetching vendors:', vendorError);
        }

        // Fetch material requests
        try {
          const requestsResponse = await fetch('/api/material-requests');
          const requestsResult = await requestsResponse.json();
          
          if (requestsResult.success) {
            setMaterialRequests(requestsResult.data || []);
          } else {
            console.warn('Failed to fetch material requests:', requestsResult.error);
            // Continue without requests - show empty state
          }
        } catch (requestError) {
          console.warn('Error fetching material requests:', requestError);
          // Continue without requests - show empty state
        }

        // Fetch contractor's projects
        // Note: The projects API will get contractor_id from auth context
        try {
          const projectsResponse = await fetch('/api/projects');
          const projectsResult = await projectsResponse.json();
          
          if (projectsResult.success) {
            setProjects(projectsResult.data.projects || []);
          } else {
            console.warn('Failed to fetch projects:', projectsResult.error);
            // Continue without projects - it's optional
          }
        } catch (projectError) {
          console.warn('Error fetching projects:', projectError);
          // Continue without projects - it's optional
        }
      } catch (error) {
        console.error('Error loading data:', error);
        alert('Failed to load materials data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Sort function
  const handleSort = (field: string, isRequest = false) => {
    if (isRequest) {
      if (requestSortField === field) {
        setRequestSortDirection(requestSortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setRequestSortField(field);
        setRequestSortDirection('asc');
      }
    } else {
      if (sortField === field) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
    }
  };

  // Filter and sort materials
  const filteredMaterials = materials
    .filter(material => {
      const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           material.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || material.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const aValue = a[sortField as keyof Material] || '';
      const bValue = b[sortField as keyof Material] || '';
      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Filter and sort requests
  const sortedRequests = materialRequests.sort((a, b) => {
    const aValue = a[requestSortField as keyof Material] || '';
    const bValue = b[requestSortField as keyof Material] || '';
    const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    return requestSortDirection === 'asc' ? comparison : -comparison;
  });


  // Submit material request
  const submitRequest = async () => {
    try {
      if (!newRequest.name || !newRequest.category || !newRequest.unit) {
        alert('Please fill in all required fields');
        return;
      }

      // Prepare request data with project context
      const requestData = {
        ...newRequest,
        project_context: newRequest.project_id ? projects.find(p => p.id === newRequest.project_id)?.project_name : ''
      };

      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();

      if (result.success) {
        alert('Material request submitted successfully!');
        setShowRequestDialog(false);
        setNewRequest({
          name: '',
          description: '',
          category: '',
          unit: '',
          project_id: '',
          urgency: 'normal'
        });
        
        // Refresh requests
        try {
          const requestsResponse = await fetch('/api/material-requests');
          const requestsResult = await requestsResponse.json();
          if (requestsResult.success) {
            setMaterialRequests(requestsResult.data || []);
          }
        } catch (error) {
          console.error('Error refreshing requests:', error);
        }
      } else {
        if (result.details && result.details.includes("Could not find the table 'public.material_requests'")) {
          alert('Material requests feature is still being set up. Please try again later.');
        } else {
          alert(result.error || 'Failed to submit request');
        }
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Error submitting material request');
    }
  };

  // Get status styling
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'approved': return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <ContractorDashboardLayout>
        <div className="p-6">
          <div className="text-center">Loading materials...</div>
        </div>
      </ContractorDashboardLayout>
    );
  }

  return (
    <ContractorDashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-primary mb-2">Project Materials</h1>
              <p className="text-secondary text-lg mb-3">
                Request and manage materials for your construction projects
              </p>
              <div className="bg-accent-orange/10 border border-accent-orange/20 rounded-lg p-4 max-w-2xl">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="font-semibold text-primary">Coming Soon: AI-Powered BOQ Analysis</h3>
                </div>
                <p className="text-sm text-secondary">
                  We're developing AI technology to automatically extract material lists from your BOQ documents. 
                  For now, you can manually request materials needed for your projects.
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={() => setShowRequestDialog(true)}
              className="ml-6"
            >
              + Request New Material
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-neutral-medium rounded-lg p-1">
            <button
              onClick={() => setActiveTab('materials')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'materials'
                  ? 'bg-neutral-dark text-primary shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Material Catalog
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'requests'
                  ? 'bg-neutral-dark text-primary shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              My Material Requests
              {materialRequests.length > 0 && (
                <span className="ml-2 bg-accent-orange text-white text-xs px-2 py-1 rounded-full">
                  {materialRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('purchase')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'purchase'
                  ? 'bg-neutral-dark text-primary shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Purchase Status
            </button>
          </div>
        </div>

        {activeTab === 'materials' ? (
          <div>
            {/* Search and Filters */}
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <Input
                  placeholder="Search materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-neutral-dark border border-neutral-medium rounded-md text-primary"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Materials Table */}
            <div className="bg-neutral-dark border border-neutral-medium rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-neutral-medium border-b border-neutral-medium">
                  <tr>
                    <th 
                      className="px-4 py-3 text-left text-sm font-medium text-primary cursor-pointer hover:bg-neutral-dark transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Material Name</span>
                        {sortField === 'name' && (
                          <span className="text-accent-orange">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-medium text-primary cursor-pointer hover:bg-neutral-dark transition-colors"
                      onClick={() => handleSort('category')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Category</span>
                        {sortField === 'category' && (
                          <span className="text-accent-orange">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-medium text-primary cursor-pointer hover:bg-neutral-dark transition-colors"
                      onClick={() => handleSort('unit')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Unit</span>
                        {sortField === 'unit' && (
                          <span className="text-accent-orange">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-primary">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-medium">
                  {filteredMaterials.map((material) => (
                    <tr key={material.id} className="hover:bg-neutral-medium transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-primary">{material.name}</td>
                      <td className="px-4 py-3 text-sm text-secondary">{material.category}</td>
                      <td className="px-4 py-3 text-sm text-secondary">{material.unit}</td>
                      <td className="px-4 py-3 text-sm text-secondary max-w-xs truncate">
                        {material.description || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredMaterials.length === 0 && (
                <div className="p-8 text-center">
                  <h3 className="text-lg font-medium text-primary mb-2">No materials found</h3>
                  <p className="text-secondary mb-4">
                    {searchTerm || selectedCategory 
                      ? 'Try adjusting your search criteria.' 
                      : 'No materials available in the database.'}
                  </p>
                  <Button onClick={() => setShowRequestDialog(true)}>
                    Request New Material
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'requests' ? (
          /* Material Requests Tab */
          <div className="bg-neutral-dark border border-neutral-medium rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-neutral-medium border-b border-neutral-medium">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-sm font-medium text-primary cursor-pointer hover:bg-neutral-dark transition-colors"
                    onClick={() => handleSort('name', true)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Material Name</span>
                      {requestSortField === 'name' && (
                        <span className="text-accent-orange">{requestSortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-sm font-medium text-primary cursor-pointer hover:bg-neutral-dark transition-colors"
                    onClick={() => handleSort('category', true)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Category</span>
                      {requestSortField === 'category' && (
                        <span className="text-accent-orange">{requestSortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-sm font-medium text-primary cursor-pointer hover:bg-neutral-dark transition-colors"
                    onClick={() => handleSort('approval_status', true)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Status</span>
                      {requestSortField === 'approval_status' && (
                        <span className="text-accent-orange">{requestSortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-sm font-medium text-primary cursor-pointer hover:bg-neutral-dark transition-colors"
                    onClick={() => handleSort('urgency', true)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Urgency</span>
                      {requestSortField === 'urgency' && (
                        <span className="text-accent-orange">{requestSortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-primary">Price</th>
                  <th 
                    className="px-4 py-3 text-left text-sm font-medium text-primary cursor-pointer hover:bg-neutral-dark transition-colors"
                    onClick={() => handleSort('created_at', true)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Submitted</span>
                      {requestSortField === 'created_at' && (
                        <span className="text-accent-orange">{requestSortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-primary">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-medium">
                {sortedRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-neutral-medium transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-primary">{request.name}</td>
                    <td className="px-4 py-3 text-sm text-secondary">{request.category}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded border ${getStatusStyle(request.approval_status || 'approved')}`}>
                        {(request.approval_status || 'approved').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded ${
                        request.urgency === 'urgent' ? 'bg-red-100 text-red-700' :
                        request.urgency === 'high' ? 'bg-orange-100 text-orange-700' :
                        request.urgency === 'low' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {request.urgency}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary">
                      {request.estimated_price ? `₹${request.estimated_price}/${request.unit}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary max-w-xs">
                      {request.approved_by && request.approval_status === 'approved' && (
                        <div className="text-green-600 text-xs mb-1">Approved by: {request.approved_by}</div>
                      )}
                      {request.rejection_reason && (
                        <div className="text-red-400 text-xs mb-1">Rejected: {request.rejection_reason}</div>
                      )}
                      <div className="text-secondary text-xs truncate">{request.description || '-'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {materialRequests.length === 0 && (
              <div className="p-8 text-center">
                <h3 className="text-lg font-medium text-primary mb-2">No requests yet</h3>
                <p className="text-secondary mb-4">
                  You haven't submitted any material requests.
                </p>
                <Button onClick={() => setShowRequestDialog(true)}>
                  Submit Your First Request
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Purchase Status Tab */
          <div>
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Purchase Status Summary</h3>
              <p className="text-sm text-blue-700">
                Overview of your material purchase requests across all projects. To create new purchase requests, go to your individual project pages.
              </p>
            </div>

            <div className="bg-neutral-dark border border-neutral-medium rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-neutral-medium border-b border-neutral-medium">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-primary">Material Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-primary">Project</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-primary">Purchase Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-primary">Vendor</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-primary">Quantity</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-primary">Estimated Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-medium">
                  {materials
                    .filter(m => m.purchase_status && m.purchase_status !== 'none')
                    .map((material) => (
                    <tr key={material.id} className="hover:bg-neutral-medium transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-primary">{material.name}</td>
                      <td className="px-4 py-3 text-sm text-secondary">{material.project_context || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded border ${
                          material.purchase_status === 'purchase_requested' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                          material.purchase_status === 'approved_for_purchase' ? 'bg-green-100 text-green-800 border-green-300' :
                          material.purchase_status === 'rejected' ? 'bg-red-100 text-red-800 border-red-300' :
                          'bg-gray-100 text-gray-800 border-gray-300'
                        }`}>
                          {material.purchase_status?.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary">
                        {material.vendor_id ? 
                          vendors.find(v => v.id.toString() === material.vendor_id?.toString())?.name || 'Unknown Vendor' 
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary">
                        {material.purchase_quantity ? `${material.purchase_quantity} ${material.unit}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary">
                        {material.purchase_quantity && material.estimated_rate ? 
                          `₹${(material.purchase_quantity * material.estimated_rate).toLocaleString('en-IN')}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {materials.filter(m => m.purchase_status && m.purchase_status !== 'none').length === 0 && (
                <div className="p-8 text-center">
                  <h3 className="text-lg font-medium text-primary mb-2">No purchase requests yet</h3>
                  <p className="text-secondary mb-4">
                    Purchase requests are created at the project level. Navigate to your projects to request materials for purchase.
                  </p>
                  <Button onClick={() => window.location.href = '/dashboard/contractor/projects'}>
                    Go to Projects
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Request Dialog */}
        {showRequestDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-dark rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-neutral-medium">
              <h2 className="text-xl font-bold mb-4 text-primary">Request New Material</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Material Name *
                    </label>
                    <Input
                      value={newRequest.name}
                      onChange={(e) => setNewRequest(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Ordinary Portland Cement 53 Grade"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Category *
                    </label>
                    <select
                      value={newRequest.category}
                      onChange={(e) => setNewRequest(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 bg-neutral-dark border border-neutral-medium rounded-md text-primary"
                    >
                      <option value="">Select category</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Description
                  </label>
                  <textarea
                    value={newRequest.description}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed description of the material"
                    className="w-full px-3 py-2 bg-neutral-dark border border-neutral-medium rounded-md h-20 text-primary"
                  />
                </div>


                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Unit *
                    </label>
                    <select
                      value={newRequest.unit}
                      onChange={(e) => setNewRequest(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-3 py-2 bg-neutral-dark border border-neutral-medium rounded-md text-primary"
                    >
                      <option value="">Select unit</option>
                      {unitOptions.map((unit) => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Urgency
                    </label>
                    <select
                      value={newRequest.urgency}
                      onChange={(e) => setNewRequest(prev => ({ ...prev, urgency: e.target.value }))}
                      className="w-full px-3 py-2 bg-neutral-dark border border-neutral-medium rounded-md text-primary"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>


                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Project
                  </label>
                  <select
                    value={newRequest.project_id}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, project_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-neutral-dark border border-neutral-medium rounded-md text-primary"
                  >
                    <option value="">Select project (optional)</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.project_name} - {project.client_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={submitRequest}>
                    Submit Request
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </ContractorDashboardLayout>
  );
}