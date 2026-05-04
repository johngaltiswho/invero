'use client';

import React, { useState, useEffect } from 'react';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';
import { Button, Input } from '@/components';
import { getPurchaseRequestDisplayState } from '@/lib/purchase-request-state';

interface Material {
  id: string;
  material_code?: string;
  name: string;
  hsn_code?: string | null;
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

interface PurchaseRequestRow {
  id: string;
  project_id: string;
  project_po_reference_id?: string | null;
  status: string;
  created_at: string;
  funded_at?: string | null;
  approved_at?: string | null;
  remarks?: string | null;
  delivery_status?: string | null;
  dispatched_at?: string | null;
  dispute_deadline?: string | null;
  dispute_raised_at?: string | null;
  dispute_reason?: string | null;
  delivered_at?: string | null;
  backfill_recorded_at?: string | null;
  backfill_recorded_by?: string | null;
  backfill_reason?: string | null;
  invoice_generated_at?: string | null;
  invoice_url?: string | null;
  invoice_download_url?: string | null;
  funded_amount?: number | null;
  returned_amount?: number | null;
  remaining_due?: number | null;
  latest_repayment_submission_status?: string | null;
  project_po_references?: {
    id: string;
    po_number: string;
    po_type?: string | null;
    status?: string | null;
    is_default?: boolean | null;
  } | null;
}

export default function MaterialsPage() {
  const normalizeCategory = (value?: string) =>
    (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

  const formatCategoryLabel = (value: string) =>
    value
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  const defaultCategories = [
    'Structural',
    'Civil',
    'Electrical',
    'Plumbing',
    'Finishing',
    'Hardware',
    'Facade',
    'Fencing'
  ];
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialRequests, setMaterialRequests] = useState<Material[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('materials');
  const [confirmingDeliveryId, setConfirmingDeliveryId] = useState<string | null>(null);
  const [disputeDialog, setDisputeDialog] = useState<{ open: boolean; prId: string }>({ open: false, prId: '' });
  const [disputeReason, setDisputeReason] = useState('');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [requestSortField, setRequestSortField] = useState<string>('created_at');
  const [requestSortDirection, setRequestSortDirection] = useState<'asc' | 'desc'>('desc');

  const [newRequest, setNewRequest] = useState({
    name: '',
    hsn_code: '',
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
          const merged = new Set<string>();
          defaultCategories.forEach((category) => {
            const key = normalizeCategory(category);
            if (key) merged.add(key);
          });
          materialsResult.data.forEach((material: Material) => {
            const key = normalizeCategory(material.category);
            if (key) merged.add(key);
          });
          setCategories(Array.from(merged).sort((a, b) => a.localeCompare(b)));
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

        // Fetch purchase requests for purchase-status tab
        try {
          const purchaseRequestsResponse = await fetch('/api/purchase-requests');
          const purchaseRequestsResult = await purchaseRequestsResponse.json();

          if (purchaseRequestsResult.success) {
            setPurchaseRequests(purchaseRequestsResult.data || []);
          } else {
            console.warn('Failed to fetch purchase requests:', purchaseRequestsResult.error);
          }
        } catch (purchaseRequestError) {
          console.warn('Error fetching purchase requests:', purchaseRequestError);
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

  // Fuzzy scoring: count overlapping words between query and target
  const fuzzyScore = (query: string, target: string): number => {
    const qWords = query.toLowerCase().split(/\s+/).filter(Boolean);
    const tWords = target.toLowerCase().split(/\s+/).filter(Boolean);
    let score = 0;
    for (const qw of qWords) {
      for (const tw of tWords) {
        if (tw.includes(qw) || qw.includes(tw)) score += 1;
        else if (tw.startsWith(qw.slice(0, 3)) || qw.startsWith(tw.slice(0, 3))) score += 0.5;
      }
    }
    return score;
  };

  // Filter and sort materials
  const filteredMaterials = materials
    .filter(material => {
      const matchesSearch = !searchTerm || material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           material.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || normalizeCategory(material.category) === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const aValue = a[sortField as keyof Material] || '';
      const bValue = b[sortField as keyof Material] || '';
      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Fuzzy suggestions — only when search has text but no exact matches
  const fuzzyMatches = (searchTerm.length >= 3 && filteredMaterials.length === 0)
    ? materials
        .map(m => ({ material: m, score: fuzzyScore(searchTerm, m.name + ' ' + (m.description || '')) }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(r => r.material)
    : [];

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
        hsn_code: newRequest.hsn_code?.trim() || undefined,
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
          hsn_code: '',
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

  const getPurchaseStatusStyle = (status?: string | null) => {
    switch (String(status || '').toLowerCase()) {
      case 'draft':
        return 'bg-neutral-medium text-secondary border-neutral-light';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'approved':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'funded':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'po_generated':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getProjectName = (projectId?: string | null) =>
    projects.find((project) => project.id === projectId)?.project_name || '-';

  const getDeliveryStatusStyle = (status?: string | null) => {
    switch (String(status || '').toLowerCase()) {
      case 'dispatched':
        return 'bg-accent-amber/10 text-accent-amber border-accent-amber/30';
      case 'backfill_pending_confirmation':
        return 'bg-blue-900/10 text-blue-400 border-blue-400/30';
      case 'disputed':
        return 'bg-red-900/10 text-red-400 border-red-400/30';
      case 'delivered':
        return 'bg-green-900/10 text-green-400 border-green-400/30';
      default:
        return 'bg-neutral-medium text-secondary border-neutral-light';
    }
  };

  const getDeliveryStatusLabel = (status?: string | null) => {
    switch (String(status || '').toLowerCase()) {
      case 'dispatched':
        return 'Awaiting Confirmation';
      case 'backfill_pending_confirmation':
        return 'Backfill Awaiting Confirmation';
      case 'disputed':
        return 'Disputed';
      case 'delivered':
        return 'Delivered';
      default:
        return 'Not Dispatched';
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
      <div className="min-w-0 p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-primary mb-2">Materials & Purchases</h1>
              <p className="text-secondary text-lg mb-3">
                Request and manage materials for your construction projects
              </p>
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
              Purchases & Delivery
              {purchaseRequests.filter(r => ['dispatched', 'backfill_pending_confirmation'].includes(String(r.delivery_status || ''))).length > 0 && (
                <span className="ml-2 bg-accent-amber text-neutral-darker text-xs px-2 py-0.5 rounded-full">
                  {purchaseRequests.filter(r => ['dispatched', 'backfill_pending_confirmation'].includes(String(r.delivery_status || ''))).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {activeTab === 'materials' ? (
          <div className="min-w-0">
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
                  <option key={category} value={category}>{formatCategoryLabel(category)}</option>
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
                    <th className="px-4 py-3 text-left text-sm font-medium text-primary">HSN</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-primary">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-medium">
                  {filteredMaterials.map((material) => (
                    <tr key={material.id} className="hover:bg-neutral-medium transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-primary">{material.name}</td>
                      <td className="px-4 py-3 text-sm text-secondary">{material.category}</td>
                      <td className="px-4 py-3 text-sm text-secondary">{material.unit}</td>
                      <td className="px-4 py-3 text-sm text-secondary">{material.hsn_code || '-'}</td>
                      <td className="px-4 py-3 text-sm text-secondary max-w-xs truncate">
                        {material.description || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredMaterials.length === 0 && (
                <div className="p-6">
                  {fuzzyMatches.length > 0 ? (
                    <div>
                      <p className="text-sm text-secondary mb-3">
                        No exact match for <strong className="text-primary">"{searchTerm}"</strong>. Similar materials you might mean:
                      </p>
                      <div className="space-y-2 mb-4">
                        {fuzzyMatches.map(m => (
                          <div key={m.id} className="flex items-center justify-between bg-neutral-darker rounded px-3 py-2 border border-neutral-medium">
                            <div>
                              <span className="text-sm text-primary">{m.name}</span>
                              <span className="ml-2 text-xs text-secondary">{m.category} · {m.unit}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-secondary mb-3">Not what you're looking for?</p>
                      <Button onClick={() => { setNewRequest(prev => ({ ...prev, name: searchTerm })); setShowRequestDialog(true); }}>
                        Request New Material
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <h3 className="text-lg font-medium text-primary mb-2">No materials found</h3>
                      <p className="text-secondary mb-4">
                        {searchTerm || selectedCategory
                          ? 'Try adjusting your search criteria, or request this material to be added.'
                          : 'No materials available in the database.'}
                      </p>
                      {(searchTerm || selectedCategory) && (
                        <Button onClick={() => { setNewRequest(prev => ({ ...prev, name: searchTerm })); setShowRequestDialog(true); }}>
                          Request New Material
                        </Button>
                      )}
                    </div>
                  )}
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
                  <th className="px-4 py-3 text-left text-sm font-medium text-primary">HSN</th>
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
                    <td className="px-4 py-3 text-sm text-secondary">{request.hsn_code || '-'}</td>
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
        ) : activeTab === 'purchase' ? (
          /* Purchase & Delivery Tab */
          <div className="min-w-0">
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Purchases & Delivery Summary</h3>
              <p className="text-sm text-blue-700">
                Track each purchase request from approval through dispatch, delivery confirmation, dispute, and invoice generation.
              </p>
            </div>

            {/* Match the same table container structure as "My Material Requests":
                no forced min-width; allow horizontal scroll only inside the card when needed. */}
            <div className="bg-neutral-dark border border-neutral-medium rounded-lg overflow-hidden">
              <div className="w-full overflow-x-auto [scrollbar-gutter:stable]">
                <table className="w-full min-w-max">
                <thead className="bg-neutral-medium border-b border-neutral-medium">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-primary">Request</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-primary w-40">Project</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-primary w-32">PO</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-primary hidden lg:table-cell">Display State</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-primary hidden lg:table-cell">Purchase Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-primary">Delivery Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-primary hidden xl:table-cell">Vendor</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-primary w-36">Dates</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-primary hidden xl:table-cell">Notes</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-primary">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-medium">
                  {purchaseRequests.map((purchaseRequest) => {
                    const displayState = getPurchaseRequestDisplayState(purchaseRequest);
                    const deadline = purchaseRequest.dispute_deadline ? new Date(purchaseRequest.dispute_deadline) : null;
                    const now = new Date();
                    const hoursLeft = deadline ? Math.max(0, (deadline.getTime() - now.getTime()) / 3600000) : 0;
                    const canDispute = ['dispatched', 'backfill_pending_confirmation'].includes(String(purchaseRequest.delivery_status || '')) && deadline && deadline > now;
                    const canConfirmDelivery = ['dispatched', 'backfill_pending_confirmation'].includes(String(purchaseRequest.delivery_status || ''));

                    return (
                      <tr key={purchaseRequest.id} className="hover:bg-neutral-medium transition-colors align-top">
                        <td className="px-4 py-3 text-sm font-medium text-primary">
                          #{purchaseRequest.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-4 py-3 text-sm text-secondary w-40 max-w-40 whitespace-normal break-words leading-snug">
                          {getProjectName(purchaseRequest.project_id)}
                        </td>
                        <td className="px-4 py-3 text-sm text-secondary w-32 max-w-32 whitespace-normal break-words leading-snug">
                          {purchaseRequest.project_po_references?.po_number || '-'}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className={`text-xs px-2 py-1 rounded border ${displayState.classes}`}>
                            {displayState.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className={`text-xs px-2 py-1 rounded border ${getPurchaseStatusStyle(purchaseRequest.status)}`}>
                            {purchaseRequest.status?.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-2">
                            <span className={`inline-flex text-xs px-2 py-1 rounded border ${getDeliveryStatusStyle(purchaseRequest.delivery_status)}`}>
                              {getDeliveryStatusLabel(purchaseRequest.delivery_status)}
                            </span>
                            {purchaseRequest.delivery_status === 'backfill_pending_confirmation' && purchaseRequest.backfill_reason && (
                              <p className="text-xs text-secondary max-w-xs">
                                Admin note: {purchaseRequest.backfill_reason}
                              </p>
                            )}
                            {canDispute && (
                              <p className={`text-xs font-medium ${hoursLeft < 6 ? 'text-red-400' : 'text-accent-amber'}`}>
                                {purchaseRequest.delivery_status === 'backfill_pending_confirmation' ? 'Auto-confirmation' : 'Dispute window'} closes in {Math.floor(hoursLeft)}h {Math.round((hoursLeft % 1) * 60)}m
                              </p>
                            )}
                            {purchaseRequest.delivery_status === 'disputed' && purchaseRequest.dispute_reason && (
                              <p className="text-xs text-red-400 max-w-xs">Dispute: {purchaseRequest.dispute_reason}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-secondary hidden xl:table-cell">
                          {purchaseRequest.status === 'rejected' ? '-' : 'Assigned in admin'}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-secondary space-y-1 leading-tight w-36 [&_p]:text-[11px] [&_p]:leading-tight">
                          <p>Created: {new Date(purchaseRequest.created_at).toLocaleDateString('en-IN')}</p>
                          {purchaseRequest.dispatched_at && (
                            <p>Dispatched: {new Date(purchaseRequest.dispatched_at).toLocaleDateString('en-IN')}</p>
                          )}
                          {purchaseRequest.delivered_at && (
                            <p>Delivered: {new Date(purchaseRequest.delivered_at).toLocaleDateString('en-IN')}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-secondary max-w-48 hidden xl:table-cell leading-tight [&_p]:text-[11px] [&_p]:leading-tight">
                          <div className="space-y-1">
                            <p className="whitespace-normal break-words">{purchaseRequest.remarks || '-'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-2">
                            {canConfirmDelivery && (
                              <button
                                onClick={async () => {
                                  try {
                                    setConfirmingDeliveryId(purchaseRequest.id);
                                    const res = await fetch('/api/delivery-tracker', {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ purchase_request_id: purchaseRequest.id, action: 'confirm' }),
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                      setPurchaseRequests(prev =>
                                        prev.map(r =>
                                          r.id === purchaseRequest.id
                                            ? {
                                                ...r,
                                                delivery_status: 'delivered',
                                                delivered_at: new Date().toISOString(),
                                                invoice_generated_at: data.invoice ? new Date().toISOString() : r.invoice_generated_at,
                                              }
                                            : r
                                        )
                                      );
                                    } else {
                                      alert(data.error || 'Failed to confirm delivery');
                                    }
                                  } catch {
                                    alert('Failed to confirm delivery');
                                  } finally {
                                    setConfirmingDeliveryId(null);
                                  }
                                }}
                                disabled={confirmingDeliveryId === purchaseRequest.id}
                                className="px-3 py-1.5 text-xs font-medium bg-green-900/20 text-green-400 border border-green-400/30 rounded hover:bg-green-900/40 transition-colors disabled:opacity-50"
                              >
                                {confirmingDeliveryId === purchaseRequest.id ? 'Confirming...' : 'Confirm Delivery'}
                              </button>
                            )}
                            {canDispute && (
                              <button
                                onClick={() => { setDisputeDialog({ open: true, prId: purchaseRequest.id }); setDisputeReason(''); }}
                                className="px-3 py-1.5 text-xs font-medium bg-red-900/20 text-red-400 border border-red-400/30 rounded hover:bg-red-900/40 transition-colors"
                              >
                                Raise Dispute
                              </button>
                            )}
                            {(purchaseRequest.invoice_download_url || purchaseRequest.invoice_url) && (
                              <a
                                href={purchaseRequest.invoice_download_url || purchaseRequest.invoice_url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 text-xs font-medium bg-accent-amber/10 text-accent-amber border border-accent-amber/30 rounded hover:bg-accent-amber/20 transition-colors"
                              >
                                View Invoice
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>

              {purchaseRequests.length === 0 && (
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
        ) : null}

        {/* Dispute Dialog */}
        {disputeDialog.open && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-dark border border-neutral-medium rounded-lg p-6 w-full max-w-md">
              <h3 className="text-base font-semibold text-primary mb-2">Raise Delivery Dispute</h3>
              <p className="text-xs text-secondary mb-4">Describe the issue with this delivery (damaged goods, wrong items, quantity mismatch, etc.)</p>
              <textarea
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                placeholder="Describe the issue..."
                rows={4}
                className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-lg text-primary text-sm placeholder-neutral-medium focus:border-accent-amber focus:outline-none resize-none mb-4"
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDisputeDialog({ open: false, prId: '' })}
                  className="px-4 py-2 text-sm text-secondary hover:text-primary"
                >
                  Cancel
                </button>
                <button
                  disabled={!disputeReason.trim()}
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/delivery-tracker', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ purchase_request_id: disputeDialog.prId, dispute_reason: disputeReason }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        setPurchaseRequests(prev => prev.map(r => r.id === disputeDialog.prId ? { ...r, delivery_status: 'disputed', dispute_reason: disputeReason } : r));
                        setDisputeDialog({ open: false, prId: '' });
                      } else {
                        alert(data.error || 'Failed to raise dispute');
                      }
                    } catch {
                      alert('Failed to raise dispute');
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
                >
                  Submit Dispute
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Request Dialog - Simplified to 3 fields */}
        {showRequestDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-dark rounded-lg p-6 w-full max-w-md border border-neutral-medium">
              <h2 className="text-lg font-bold mb-1 text-primary">Request New Material</h2>
              <p className="text-xs text-secondary mb-5">
                Can't find it in the catalog? Request it — our team reviews within 24 hours and adds it to the master list.
              </p>

              <div className="space-y-4">
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
                    HSN Code
                  </label>
                  <Input
                    value={newRequest.hsn_code}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, hsn_code: e.target.value }))}
                    placeholder="Optional HSN/SAC"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Category *
                  </label>
                  <select
                    value={newRequest.category}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary focus:border-accent-amber focus:outline-none"
                  >
                    <option value="">Select category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{formatCategoryLabel(category)}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Unit *
                  </label>
                  <select
                    value={newRequest.unit}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary focus:border-accent-amber focus:outline-none"
                  >
                    <option value="">Select unit</option>
                    {unitOptions.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-2">
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
