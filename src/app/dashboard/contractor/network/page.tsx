'use client';

import React, { useState, useEffect } from 'react';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';
import { Button, LoadingSpinner } from '@/components';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useContractorV2 } from '@/contexts/ContractorContextV2';

interface Vendor {
  id: number;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
  specialties: string;
  createdAt: string;
  updatedAt: string;
}

interface Client {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  company_type?: string;
  gst_number?: string;
  pan_number?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export default function NetworkPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { contractor, loading: contractorLoading } = useContractorV2();

  // State management
  const [activeTab, setActiveTab] = useState<'clients' | 'vendors'>('clients');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVendorDialog, setShowVendorDialog] = useState(false);
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [vendorForm, setVendorForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    specialties: '',
    gstNumber: ''
  });
  const [clientForm, setClientForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    company_type: '',
    gst_number: '',
    pan_number: '',
    notes: ''
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
      return;
    }
  }, [isLoaded, user, router]);

  // Fetch vendors and clients
  useEffect(() => {
    if (contractor?.id) {
      fetchVendors();
      fetchClients();
    }
  }, [contractor?.id]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vendors?contractor_id=${contractor?.id}`);
      if (response.ok) {
        const data = await response.json();
        setVendors(data.vendors || []);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch(`/api/clients?contractor_id=${contractor?.id}`);
      if (response.ok) {
        const data = await response.json();
        setClients(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleAddVendor = () => {
    setEditingVendor(null);
    setVendorForm({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      specialties: '',
      gstNumber: ''
    });
    setShowVendorDialog(true);
  };

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setVendorForm({
      name: vendor.name,
      contactPerson: vendor.contactPerson,
      phone: vendor.phone,
      email: vendor.email,
      address: vendor.address,
      specialties: vendor.specialties,
      gstNumber: vendor.gstNumber
    });
    setShowVendorDialog(true);
  };

  const handleSaveVendor = async () => {
    try {
      if (!vendorForm.name || !vendorForm.phone) {
        alert('Please fill in required fields: Name and Phone');
        return;
      }

      const url = editingVendor ? '/api/vendors' : '/api/vendors';
      const method = editingVendor ? 'PUT' : 'POST';
      const body = editingVendor 
        ? { id: editingVendor.id, ...vendorForm }
        : { contractor_id: contractor?.id, ...vendorForm };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await fetchVendors();
        setShowVendorDialog(false);
        alert(editingVendor ? 'Vendor updated successfully!' : 'Vendor added successfully!');
      } else {
        alert('Failed to save vendor');
      }
    } catch (error) {
      console.error('Error saving vendor:', error);
      alert('Failed to save vendor');
    }
  };

  const handleDeleteVendor = async (vendorId: number) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return;

    try {
      const response = await fetch(`/api/vendors?id=${vendorId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchVendors();
        alert('Vendor deleted successfully!');
      } else {
        alert('Failed to delete vendor');
      }
    } catch (error) {
      console.error('Error deleting vendor:', error);
      alert('Failed to delete vendor');
    }
  };

  // Client management functions
  const handleAddClient = () => {
    setEditingClient(null);
    setClientForm({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      company_type: '',
      gst_number: '',
      pan_number: '',
      notes: ''
    });
    setShowClientDialog(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setClientForm({
      name: client.name,
      contact_person: client.contact_person || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      company_type: client.company_type || '',
      gst_number: client.gst_number || '',
      pan_number: client.pan_number || '',
      notes: client.notes || ''
    });
    setShowClientDialog(true);
  };

  const handleSaveClient = async () => {
    try {
      if (!clientForm.name) {
        alert('Please fill in client name');
        return;
      }

      const method = editingClient ? 'PUT' : 'POST';
      const body = editingClient 
        ? { id: editingClient.id, ...clientForm }
        : { ...clientForm, contractor_id: contractor?.id };

      const response = await fetch('/api/clients', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await fetchClients();
        setShowClientDialog(false);
        alert(editingClient ? 'Client updated successfully!' : 'Client added successfully!');
      } else {
        alert('Failed to save client');
      }
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Failed to save client');
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      const response = await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientId, status: 'inactive' })
      });

      if (response.ok) {
        await fetchClients();
        alert('Client deactivated successfully!');
      } else {
        alert('Failed to deactivate client');
      }
    } catch (error) {
      console.error('Error deactivating client:', error);
      alert('Failed to deactivate client');
    }
  };

  // Show loading state
  if (!isLoaded || contractorLoading || loading) {
    return (
      <div className="min-h-screen bg-neutral-darker flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Show access denied if no contractor
  if (!contractor) {
    return (
      <div className="min-h-screen bg-neutral-darker flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-primary mb-2">Access Denied</h2>
          <p className="text-secondary mb-4">
            You don't have access to the contractor network. Please contact support.
          </p>
          <Button onClick={() => window.location.href = '/dashboard/contractor'} variant="primary" size="sm">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ContractorDashboardLayout activeTab="network">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">My Network</h1>
          <p className="text-secondary">
            Manage your clients, vendors, and business partners
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-neutral-medium">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'clients', name: 'Clients', description: 'Manage your clients' },
                { id: 'vendors', name: 'Vendors', description: 'Manage your suppliers' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'clients' | 'vendors')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-accent-blue text-accent-blue'
                      : 'border-transparent text-secondary hover:text-primary hover:border-neutral-light'
                  }`}
                >
                  <div className="flex flex-col items-start">
                    <span>{tab.name}</span>
                    <span className="text-xs opacity-70">{tab.description}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Network Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {activeTab === 'clients' ? (
            <>
              <div className="bg-neutral-dark border border-neutral-medium rounded-lg p-4">
                <div className="text-accent-amber text-sm font-mono mb-2">TOTAL CLIENTS</div>
                <div className="text-2xl font-bold text-primary mb-1">{clients.length}</div>
                <div className="text-xs text-secondary">All clients</div>
              </div>
              <div className="bg-neutral-dark border border-neutral-medium rounded-lg p-4">
                <div className="text-accent-amber text-sm font-mono mb-2">ACTIVE CLIENTS</div>
                <div className="text-2xl font-bold text-primary mb-1">{clients.filter(c => c.status === 'active').length}</div>
                <div className="text-xs text-success">Currently active</div>
              </div>
              <div className="bg-neutral-dark border border-neutral-medium rounded-lg p-4">
                <div className="text-accent-amber text-sm font-mono mb-2">GST REGISTERED</div>
                <div className="text-2xl font-bold text-primary mb-1">
                  {clients.filter(c => c.gst_number).length}
                </div>
                <div className="text-xs text-secondary">With GST numbers</div>
              </div>
              <div className="bg-neutral-dark border border-neutral-medium rounded-lg p-4">
                <div className="text-accent-amber text-sm font-mono mb-2">COMPANIES</div>
                <div className="text-2xl font-bold text-primary mb-1">
                  {clients.filter(c => c.company_type === 'company').length}
                </div>
                <div className="text-xs text-secondary">Corporate clients</div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-neutral-dark border border-neutral-medium rounded-lg p-4">
                <div className="text-accent-amber text-sm font-mono mb-2">TOTAL VENDORS</div>
                <div className="text-2xl font-bold text-primary mb-1">{vendors.length}</div>
                <div className="text-xs text-secondary">All vendors</div>
              </div>
              <div className="bg-neutral-dark border border-neutral-medium rounded-lg p-4">
                <div className="text-accent-amber text-sm font-mono mb-2">ACTIVE VENDORS</div>
                <div className="text-2xl font-bold text-primary mb-1">{vendors.length}</div>
                <div className="text-xs text-success">Currently available</div>
              </div>
              <div className="bg-neutral-dark border border-neutral-medium rounded-lg p-4">
                <div className="text-accent-amber text-sm font-mono mb-2">GST VERIFIED</div>
                <div className="text-2xl font-bold text-primary mb-1">
                  {vendors.filter(v => v.gstNumber).length}
                </div>
                <div className="text-xs text-secondary">GST registered</div>
              </div>
              <div className="bg-neutral-dark border border-neutral-medium rounded-lg p-4">
                <div className="text-accent-amber text-sm font-mono mb-2">SPECIALTIES</div>
                <div className="text-2xl font-bold text-primary mb-1">
                  {new Set(vendors.flatMap(v => v.specialties.split(',').map(s => s.trim()))).size}
                </div>
                <div className="text-xs text-secondary">Material categories</div>
              </div>
            </>
          )}
        </div>

        {/* Clients Section */}
        {activeTab === 'clients' && (
          <div className="bg-neutral-dark border border-neutral-medium rounded-lg">
            <div className="border-b border-neutral-medium p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-primary mb-2">Clients</h2>
                  <p className="text-secondary">
                    Manage your clients for project creation and billing
                  </p>
                </div>
                <button
                  onClick={handleAddClient}
                  className="bg-accent-amber text-neutral-dark px-4 py-2 rounded-lg font-medium hover:bg-accent-amber/90 transition-colors"
                >
                  + Add Client
                </button>
              </div>
            </div>

            <div className="p-6">
              {clients.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🏢</div>
                  <h3 className="text-lg font-semibold text-primary mb-2">No Clients Added</h3>
                  <p className="text-secondary mb-4">
                    Add your first client to start creating projects
                  </p>
                  <button
                    onClick={handleAddClient}
                    className="bg-accent-amber text-neutral-dark px-6 py-2 rounded-lg font-medium hover:bg-accent-amber/90 transition-colors"
                  >
                    Add Your First Client
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-medium">
                        <th className="text-left py-3 px-4 text-sm font-medium text-secondary">Name</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-secondary">Contact Person</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-secondary">Phone</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-secondary">Email</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-secondary">Type</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-secondary">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-secondary">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((client) => (
                        <tr key={client.id} className="border-b border-neutral-medium/50 hover:bg-neutral-darker/50">
                          <td className="py-3 px-4">
                            <div className="font-medium text-primary">{client.name}</div>
                            {client.gst_number && (
                              <div className="text-xs text-secondary">GST: {client.gst_number}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-secondary">{client.contact_person || '-'}</td>
                          <td className="py-3 px-4 text-secondary">{client.phone || '-'}</td>
                          <td className="py-3 px-4 text-secondary">{client.email || '-'}</td>
                          <td className="py-3 px-4">
                            {client.company_type && (
                              <span className="inline-block bg-accent-blue/20 text-accent-blue text-xs px-2 py-1 rounded">
                                {client.company_type}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block text-xs px-2 py-1 rounded ${
                              client.status === 'active' 
                                ? 'bg-success/20 text-success' 
                                : 'bg-error/20 text-error'
                            }`}>
                              {client.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditClient(client)}
                                className="text-accent-blue hover:text-accent-blue/80 text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteClient(client.id)}
                                className="text-error hover:text-error/80 text-sm"
                              >
                                Deactivate
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vendors Section */}
        {activeTab === 'vendors' && (
          <div className="bg-neutral-dark border border-neutral-medium rounded-lg">
            <div className="border-b border-neutral-medium p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-primary mb-2">Vendors & Suppliers</h2>
                  <p className="text-secondary">
                    Manage your trusted vendors for material procurement
                  </p>
                </div>
                <button
                  onClick={handleAddVendor}
                  className="bg-accent-amber text-neutral-dark px-4 py-2 rounded-lg font-medium hover:bg-accent-amber/90 transition-colors"
                >
                  + Add Vendor
                </button>
              </div>
            </div>

            <div className="p-6">
              {vendors.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🏢</div>
                  <h3 className="text-lg font-semibold text-primary mb-2">No Vendors Added</h3>
                  <p className="text-secondary mb-4">
                    Add your first vendor to start building your network
                  </p>
                  <button
                    onClick={handleAddVendor}
                    className="bg-accent-amber text-neutral-dark px-6 py-2 rounded-lg font-medium hover:bg-accent-amber/90 transition-colors"
                  >
                    Add Your First Vendor
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-medium">
                        <th className="text-left py-3 px-4 text-sm font-medium text-secondary">Name</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-secondary">Contact Person</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-secondary">Phone</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-secondary">Email</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-secondary">Specialties</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-secondary">GST</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-secondary">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendors.map((vendor) => (
                        <tr key={vendor.id} className="border-b border-neutral-medium/50 hover:bg-neutral-darker/50">
                          <td className="py-3 px-4">
                            <div className="font-medium text-primary">{vendor.name}</div>
                          </td>
                          <td className="py-3 px-4 text-secondary">{vendor.contactPerson || '-'}</td>
                          <td className="py-3 px-4 text-secondary">{vendor.phone}</td>
                          <td className="py-3 px-4 text-secondary">{vendor.email || '-'}</td>
                          <td className="py-3 px-4">
                            {vendor.specialties && (
                              <div className="flex flex-wrap gap-1">
                                {vendor.specialties.split(',').slice(0, 2).map((specialty, index) => (
                                  <span
                                    key={index}
                                    className="bg-accent-amber/20 text-accent-amber text-xs px-2 py-1 rounded"
                                  >
                                    {specialty.trim()}
                                  </span>
                                ))}
                                {vendor.specialties.split(',').length > 2 && (
                                  <span className="text-xs text-secondary">+{vendor.specialties.split(',').length - 2}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-secondary text-xs">{vendor.gstNumber || '-'}</td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditVendor(vendor)}
                                className="text-accent-blue hover:text-accent-blue/80 text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteVendor(vendor.id)}
                                className="text-error hover:text-error/80 text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Vendor Dialog */}
      {showVendorDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-dark rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-neutral-medium">
            <h2 className="text-xl font-bold mb-4 text-primary">
              {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Vendor Name *
                  </label>
                  <input
                    type="text"
                    value={vendorForm.name}
                    onChange={(e) => setVendorForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ABC Suppliers"
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={vendorForm.contactPerson}
                    onChange={(e) => setVendorForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={vendorForm.phone}
                    onChange={(e) => setVendorForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={vendorForm.email}
                    onChange={(e) => setVendorForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contact@supplier.com"
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    GST Number
                  </label>
                  <input
                    type="text"
                    value={vendorForm.gstNumber}
                    onChange={(e) => setVendorForm(prev => ({ ...prev, gstNumber: e.target.value }))}
                    placeholder="22AAAAA0000A1Z5"
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  />
                </div>
                <div></div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Address
                </label>
                <textarea
                  value={vendorForm.address}
                  onChange={(e) => setVendorForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Vendor's business address"
                  className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md h-20 text-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Specialties
                </label>
                <input
                  type="text"
                  value={vendorForm.specialties}
                  onChange={(e) => setVendorForm(prev => ({ ...prev, specialties: e.target.value }))}
                  placeholder="Cement, Steel, Aggregates (comma separated)"
                  className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowVendorDialog(false)}
                className="px-4 py-2 bg-neutral-medium text-secondary rounded-md hover:bg-neutral-medium/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVendor}
                disabled={!vendorForm.name || !vendorForm.phone}
                className="px-4 py-2 bg-accent-amber text-neutral-dark rounded-md hover:bg-accent-amber/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingVendor ? 'Update Vendor' : 'Add Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Dialog */}
      {showClientDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-dark rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-neutral-medium">
            <h2 className="text-xl font-bold mb-4 text-primary">
              {editingClient ? 'Edit Client' : 'Add New Client'}
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    value={clientForm.name}
                    onChange={(e) => setClientForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ABC Company"
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={clientForm.contact_person}
                    onChange={(e) => setClientForm(prev => ({ ...prev, contact_person: e.target.value }))}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={clientForm.email}
                    onChange={(e) => setClientForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contact@company.com"
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Company Type
                  </label>
                  <select
                    value={clientForm.company_type}
                    onChange={(e) => setClientForm(prev => ({ ...prev, company_type: e.target.value }))}
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  >
                    <option value="">Select type</option>
                    <option value="individual">Individual</option>
                    <option value="company">Company</option>
                    <option value="government">Government</option>
                    <option value="ngo">NGO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    GST Number
                  </label>
                  <input
                    type="text"
                    value={clientForm.gst_number}
                    onChange={(e) => setClientForm(prev => ({ ...prev, gst_number: e.target.value }))}
                    placeholder="22AAAAA0000A1Z5"
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  PAN Number
                </label>
                <input
                  type="text"
                  value={clientForm.pan_number}
                  onChange={(e) => setClientForm(prev => ({ ...prev, pan_number: e.target.value }))}
                  placeholder="AAAAA0000A"
                  className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Address
                </label>
                <textarea
                  value={clientForm.address}
                  onChange={(e) => setClientForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Client's address"
                  className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md h-20 text-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Notes
                </label>
                <textarea
                  value={clientForm.notes}
                  onChange={(e) => setClientForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about the client"
                  className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md h-20 text-primary"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowClientDialog(false)}
                className="px-4 py-2 bg-neutral-medium text-secondary rounded-md hover:bg-neutral-medium/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveClient}
                disabled={!clientForm.name}
                className="px-4 py-2 bg-accent-amber text-neutral-dark rounded-md hover:bg-accent-amber/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingClient ? 'Update Client' : 'Add Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ContractorDashboardLayout>
  );
}