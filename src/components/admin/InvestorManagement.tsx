'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components';

interface Investor {
  id: string;
  email: string;
  name: string;
  investor_type: 'Individual' | 'HNI' | 'Family Office' | 'Institutional';
  phone?: string;
  status: 'pending' | 'active' | 'suspended';
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

interface InvestorFormData {
  email: string;
  name: string;
  investor_type: 'Individual' | 'HNI' | 'Family Office' | 'Institutional';
  phone: string;
  notes: string;
}

const InvestorManagement: React.FC = () => {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<Investor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [processing, setProcessing] = useState<string | null>(null);
  const [formData, setFormData] = useState<InvestorFormData>({
    email: '',
    name: '',
    investor_type: 'Individual',
    phone: '',
    notes: ''
  });

  const fetchInvestors = async (page: number = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/admin/investors?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch investors');
      }

      setInvestors(data.investors);
      setCurrentPage(data.pagination.page);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingInvestor 
        ? `/api/admin/investors/${editingInvestor.id}` 
        : '/api/admin/investors';
      
      const method = editingInvestor ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save investor');
      }

      // Reset form and refresh list
      setFormData({
        email: '',
        name: '',
        investor_type: 'Individual',
        phone: '',
        notes: ''
      });
      setShowAddForm(false);
      setEditingInvestor(null);
      fetchInvestors(currentPage);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleEdit = (investor: Investor) => {
    setFormData({
      email: investor.email,
      name: investor.name,
      investor_type: investor.investor_type,
      phone: investor.phone || '',
      notes: investor.notes || ''
    });
    setEditingInvestor(investor);
    setShowAddForm(true);
  };

  const handleStatusChange = async (investor: Investor, newStatus: 'active' | 'suspended') => {
    setProcessing(`${investor.id}-status`);
    
    try {
      const response = await fetch(`/api/admin/investors/${investor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...investor,
          status: newStatus
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }

      // Update selected investor if it's the one being modified
      if (selectedInvestor?.id === investor.id) {
        setSelectedInvestor({ ...selectedInvestor, status: newStatus });
      }

      fetchInvestors(currentPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (investor: Investor) => {
    if (!confirm(`Are you sure you want to delete investor ${investor.name}?`)) {
      return;
    }

    setProcessing(`${investor.id}-delete`);

    try {
      const response = await fetch(`/api/admin/investors/${investor.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete investor');
      }

      // Clear selected investor if it's the one being deleted
      if (selectedInvestor?.id === investor.id) {
        setSelectedInvestor(null);
      }

      fetchInvestors(currentPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setProcessing(null);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      investor_type: 'Individual',
      phone: '',
      notes: ''
    });
    setEditingInvestor(null);
    setShowAddForm(false);
  };

  useEffect(() => {
    fetchInvestors();
  }, [searchTerm, statusFilter]);

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getInvestorTypeColor = (type: string) => {
    const colors = {
      Individual: 'text-blue-600',
      HNI: 'text-purple-600',
      'Family Office': 'text-green-600',
      Institutional: 'text-orange-600'
    };
    return colors[type as keyof typeof colors] || 'text-gray-600';
  };

  if (loading && investors.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-orange"></div>
        <span className="ml-3 text-secondary">Loading investors...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Investor Management</h1>
        <p className="text-secondary">Manage investor access and permissions for the investor portal</p>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg mb-6">
          <div className="flex items-center">
            <span className="text-lg mr-2">⚠️</span>
            {error}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Investors List */}
        <div className="lg:col-span-1">
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
            <div className="p-4 border-b border-neutral-medium">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-primary">Investors</h2>
                <Button
                  onClick={() => setShowAddForm(true)}
                  variant="primary"
                  className="text-sm px-3 py-1"
                >
                  Add New
                </Button>
              </div>
              
              {/* Filters */}
              <div className="space-y-3">
                <div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                  />
                </div>
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                  >
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="divide-y divide-neutral-medium max-h-96 overflow-y-auto">
              {investors.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="text-4xl mb-4">👥</div>
                  <h3 className="text-lg font-semibold text-primary mb-2">No Investors</h3>
                  <p className="text-secondary text-sm">No investors found. Add a new investor to get started.</p>
                </div>
              ) : (
                investors.map((investor) => (
                  <div
                    key={investor.id}
                    className={`p-4 cursor-pointer hover:bg-neutral-medium/50 transition-colors ${
                      selectedInvestor?.id === investor.id ? 'bg-neutral-medium/50 border-l-4 border-l-accent-orange' : ''
                    }`}
                    onClick={() => setSelectedInvestor(investor)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-primary text-sm">{investor.name}</h3>
                        <p className="text-xs text-secondary">{investor.email}</p>
                        {investor.phone && (
                          <p className="text-xs text-secondary">{investor.phone}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <span className={`text-xs px-2 py-1 rounded border ${
                          investor.status === 'active' ? 'text-success bg-success/10 border-success/20' :
                          investor.status === 'pending' ? 'text-accent-amber bg-accent-amber/10 border-accent-amber/20' :
                          'text-error bg-error/10 border-error/20'
                        }`}>
                          {investor.status.toUpperCase()}
                        </span>
                        <span className={`text-xs px-1 py-0.5 rounded ${getInvestorTypeColor(investor.investor_type)}`}>
                          {investor.investor_type}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-secondary">
                      Created: {new Date(investor.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-neutral-medium">
                <div className="flex justify-between items-center text-sm">
                  <Button
                    onClick={() => fetchInvestors(currentPage - 1)}
                    disabled={currentPage === 1}
                    variant="secondary"
                    className="text-xs px-2 py-1"
                  >
                    Previous
                  </Button>
                  <span className="text-secondary">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    onClick={() => fetchInvestors(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    variant="secondary"
                    className="text-xs px-2 py-1"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Investor Details Panel */}
        <div className="lg:col-span-2">
          {selectedInvestor ? (
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="p-6 border-b border-neutral-medium">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-primary">{selectedInvestor.name}</h2>
                    <p className="text-secondary">{selectedInvestor.email}</p>
                    {selectedInvestor.phone && (
                      <p className="text-sm text-secondary mt-1">{selectedInvestor.phone}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded border text-sm ${
                    selectedInvestor.status === 'active' ? 'text-success bg-success/10 border-success/20' :
                    selectedInvestor.status === 'pending' ? 'text-accent-amber bg-accent-amber/10 border-accent-amber/20' :
                    'text-error bg-error/10 border-error/20'
                  }`}>
                    {selectedInvestor.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-primary mb-3">Investor Details</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong className="text-primary">Type:</strong> <span className={getInvestorTypeColor(selectedInvestor.investor_type)}>{selectedInvestor.investor_type}</span></div>
                      <div><strong className="text-primary">Email:</strong> <span className="text-secondary">{selectedInvestor.email}</span></div>
                      {selectedInvestor.phone && (
                        <div><strong className="text-primary">Phone:</strong> <span className="text-secondary">{selectedInvestor.phone}</span></div>
                      )}
                      <div><strong className="text-primary">Created:</strong> <span className="text-secondary">{new Date(selectedInvestor.created_at).toLocaleDateString()}</span></div>
                      <div><strong className="text-primary">Updated:</strong> <span className="text-secondary">{new Date(selectedInvestor.updated_at).toLocaleDateString()}</span></div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-primary mb-3">Access Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong className="text-primary">Status:</strong> <span className="text-secondary capitalize">{selectedInvestor.status}</span></div>
                      <div><strong className="text-primary">Dashboard Access:</strong> <span className={selectedInvestor.status === 'active' ? 'text-success' : 'text-error'}>{selectedInvestor.status === 'active' ? 'Enabled' : 'Disabled'}</span></div>
                    </div>
                  </div>
                </div>

                {selectedInvestor.notes && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-primary mb-2">Notes</h3>
                    <p className="text-sm text-secondary bg-neutral-medium/30 p-3 rounded">{selectedInvestor.notes}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="bg-accent-amber/5 border border-accent-amber/20 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-primary mb-4">Actions</h3>
                  <div className="flex space-x-3">
                    <Button
                      variant="primary"
                      onClick={() => handleEdit(selectedInvestor)}
                    >
                      Edit Investor
                    </Button>
                    {selectedInvestor.status === 'active' ? (
                      <Button
                        variant="outline"
                        onClick={() => handleStatusChange(selectedInvestor, 'suspended')}
                        disabled={processing === `${selectedInvestor.id}-status`}
                      >
                        {processing === `${selectedInvestor.id}-status` ? 'Suspending...' : 'Suspend Access'}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => handleStatusChange(selectedInvestor, 'active')}
                        disabled={processing === `${selectedInvestor.id}-status`}
                      >
                        {processing === `${selectedInvestor.id}-status` ? 'Activating...' : 'Activate Access'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => handleDelete(selectedInvestor)}
                      disabled={processing === `${selectedInvestor.id}-delete`}
                      className="text-error hover:bg-error/10"
                    >
                      {processing === `${selectedInvestor.id}-delete` ? 'Deleting...' : 'Delete Investor'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-8 text-center">
              <div className="text-4xl mb-4">👈</div>
              <h3 className="text-lg font-semibold text-primary mb-2">Select an Investor</h3>
              <p className="text-secondary">Choose an investor from the list to view details and manage access</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium max-w-md w-full">
            <div className="p-6 border-b border-neutral-medium">
              <h2 className="text-xl font-semibold text-primary">
                {editingInvestor ? 'Edit Investor' : 'Add New Investor'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Investor Type *
                </label>
                <select
                  required
                  value={formData.investor_type}
                  onChange={(e) => setFormData({ ...formData, investor_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                >
                  <option value="Individual">Individual</option>
                  <option value="HNI">HNI</option>
                  <option value="Family Office">Family Office</option>
                  <option value="Institutional">Institutional</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                />
              </div>
              
              <div className="flex space-x-4 pt-4">
                <Button type="submit" variant="primary">
                  {editingInvestor ? 'Update Investor' : 'Add Investor'}
                </Button>
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestorManagement;