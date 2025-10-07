'use client';

import React, { useState, useEffect } from 'react';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';
import { Button, Input } from '@/components';

interface Material {
  id: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  current_price: number;
}

interface MaterialRequest {
  id: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  estimated_price?: number;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  justification: string;
  project_context?: string;
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  review_notes?: string;
  rejection_reason?: string;
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
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
    estimated_price: '',
    justification: '',
    project_context: '',
    urgency: 'normal'
  });

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

        // Fetch material requests
        const requestsResponse = await fetch('/api/material-requests');
        const requestsResult = await requestsResponse.json();
        
        if (requestsResult.success) {
          setMaterialRequests(requestsResult.data);
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
    const aValue = a[requestSortField as keyof MaterialRequest] || '';
    const bValue = b[requestSortField as keyof MaterialRequest] || '';
    const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    return requestSortDirection === 'asc' ? comparison : -comparison;
  });

  // Submit material request
  const submitRequest = async () => {
    try {
      if (!newRequest.name || !newRequest.category || !newRequest.unit || !newRequest.justification) {
        alert('Please fill in all required fields');
        return;
      }

      const response = await fetch('/api/material-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRequest)
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
          estimated_price: '',
          justification: '',
          project_context: '',
          urgency: 'normal'
        });
        
        // Refresh requests
        const requestsResponse = await fetch('/api/material-requests');
        const requestsResult = await requestsResponse.json();
        if (requestsResult.success) {
          setMaterialRequests(requestsResult.data);
        }
      } else {
        alert(result.error || 'Failed to submit request');
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
      case 'under_review': return 'bg-blue-100 text-blue-800 border-blue-300';
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-primary">Material Master</h1>
            <p className="text-secondary">Browse materials and request new additions</p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowRequestDialog(true)}
          >
            + Request New Material
          </Button>
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
              Browse Materials
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'requests'
                  ? 'bg-neutral-dark text-primary shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              My Requests
              {materialRequests.length > 0 && (
                <span className="ml-2 bg-accent-orange text-white text-xs px-2 py-1 rounded-full">
                  {materialRequests.length}
                </span>
              )}
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
        ) : (
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
                    onClick={() => handleSort('status', true)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Status</span>
                      {requestSortField === 'status' && (
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
                      <span className={`text-xs px-2 py-1 rounded border ${getStatusStyle(request.status)}`}>
                        {request.status.replace('_', ' ').toUpperCase()}
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
                      {request.review_notes && (
                        <div className="text-accent-amber text-xs mb-1">Admin: {request.review_notes}</div>
                      )}
                      {request.rejection_reason && (
                        <div className="text-red-400 text-xs mb-1">Rejected: {request.rejection_reason}</div>
                      )}
                      <div className="text-secondary text-xs truncate">{request.justification}</div>
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
                      placeholder="e.g., High Strength Concrete"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Category *
                    </label>
                    <Input
                      value={newRequest.category}
                      onChange={(e) => setNewRequest(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="e.g., Concrete, Steel, Electrical"
                    />
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

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Unit *
                    </label>
                    <Input
                      value={newRequest.unit}
                      onChange={(e) => setNewRequest(prev => ({ ...prev, unit: e.target.value }))}
                      placeholder="kg, meter, nos, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Estimated Price (₹)
                    </label>
                    <Input
                      type="number"
                      value={newRequest.estimated_price}
                      onChange={(e) => setNewRequest(prev => ({ ...prev, estimated_price: e.target.value }))}
                      placeholder="Price per unit"
                    />
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
                    Justification *
                  </label>
                  <textarea
                    value={newRequest.justification}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, justification: e.target.value }))}
                    placeholder="Why do you need this material? How will it be used?"
                    className="w-full px-3 py-2 bg-neutral-dark border border-neutral-medium rounded-md h-20 text-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Project Context
                  </label>
                  <Input
                    value={newRequest.project_context}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, project_context: e.target.value }))}
                    placeholder="Which project needs this material?"
                  />
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